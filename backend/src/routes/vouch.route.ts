import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Expo from "expo-server-sdk";
import { requireAuth, vouchProfileLimiter, vouchGiveLimiter } from "../middleware";
import { VouchProfileModel } from "../models/vouchProfileModel";
import { VouchRequestModel } from "../models/vouchRequestModel";
import { GivenVouchModel } from "../models/givenVouchModel";
import { VouchNotificationModel } from "../models/vouchNotificationModel";
import { UserModel } from "../models/userModel";
import { sendVouchRequestEmail, sendVouchedForEmail } from "../service/email.service";

export const vouchRouter = express.Router();
const expo = new Expo();

// POST /vouch/profile — save or update the logged-in user's vouch profile, then notify references
vouchRouter.post(
  "/profile",
  requireAuth,
  vouchProfileLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const body = req.body;

      // Source identity fields from DB — not the request body — to prevent impersonation
      const dbUser = await UserModel.findById(userId).select("name abn").lean();
      const fromName = dbUser?.name ?? "";
      const fromAbn = dbUser?.abn ?? body.abn ?? "";

      const profile = await VouchProfileModel.findOneAndUpdate(
        { userId },
        { ...body, userId, submittedAt: new Date() },
        { upsert: true, returnDocument: "after", runValidators: true }
      );

      const references: Array<{
        name: string;
        company: string;
        mobile: string;
        email?: string;
        relationship: string;
        project: string;
      }> = body.references ?? [];

      const fromCompany = body.trade ?? body.name ?? "Unknown";
      const userAbn: string = body.abn ?? "";

      // Pre-check: block if any reference has already given a vouch to this user
      for (const ref of references) {
        if (!ref.name || !ref.mobile) continue;
        const orConditions: object[] = [{ mobile: ref.mobile }];
        if (ref.email) orConditions.push({ email: ref.email });
        const refUser = await UserModel.findOne({ $or: orConditions }).select("_id").lean();
        if (refUser && userAbn) {
          const alreadyVouched = await GivenVouchModel.exists({
            fromUserId: refUser._id,
            toAbn: userAbn,
          });
          if (alreadyVouched) {
            res.status(400).json({
              error: `${ref.name} has already vouched for you. You cannot send them another request.`,
            });
            return;
          }
        }
      }

      for (const ref of references) {
        if (!ref.name || !ref.mobile) continue;

        // Skip if a request was already sent to this reference
        const dupConditions: object[] = [{ toMobile: ref.mobile }];
        if (ref.email) dupConditions.push({ toEmail: ref.email });
        const existing = await VouchRequestModel.exists({ fromUserId: userId, $or: dupConditions });
        if (existing) continue;

        const toEmail = ref.email?.trim().toLowerCase() ?? "";

        const request = await VouchRequestModel.create({
          fromUserId: userId,
          fromName,
          fromCompany,
          fromAbn,
          toEmail,
          toMobile: ref.mobile,
          relationship: ref.relationship,
          projectName: ref.project,
          status: "pending",
        });

        // Find the reference's user account — match by either mobile or email
        const orConditions: object[] = [{ mobile: ref.mobile }];
        if (toEmail) orConditions.push({ email: toEmail });

        const refUser = await UserModel.findOne({ $or: orConditions })
          .select("_id pushToken")
          .lean();

        if (refUser) {
          // In-app notification
          await VouchNotificationModel.create({
            recipientUserId: refUser._id,
            requestId: request._id,
            fromName,
            fromCompany,
            projectName: ref.project,
          });

          // Push notification (best-effort)
          const token = refUser.pushToken;
          if (token && Expo.isExpoPushToken(token)) {
            expo
              .sendPushNotificationsAsync([
                {
                  to: token,
                  title: "New vouch request",
                  body: `${fromName} from ${fromCompany} has asked you to vouch for them.`,
                  data: { type: "VouchRequest", requestId: request._id.toString() },
                },
              ])
              .catch(() => {});
          }
        }

        // Email notification — sent regardless of whether reference is on VouchPay
        if (toEmail) {
          sendVouchRequestEmail(
            toEmail,
            body.name,
            fromCompany,
            ref.relationship,
            ref.project
          ).catch(() => {});
        }
      }

      // Keep UserModel in sync so Give a Vouch notifications work
      await UserModel.findByIdAndUpdate(userId, {
        abn: body.abn,
        businessName: body.trade ?? body.name,
      });

      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/profile/me — retrieve the logged-in user's vouch profile
vouchRouter.get(
  "/profile/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const profile = await VouchProfileModel.findOne({ userId });

      if (!profile) {
        res.status(404).json({ error: "No profile found" });
        return;
      }

      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/requests/sent — requests the current user sent out for their own profile
vouchRouter.get(
  "/requests/sent",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const requests = await VouchRequestModel.find({
        fromUserId: userId,
        status: { $ne: "ignored" },
      })
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /vouch/requests/:id/ignore — silently dismiss a vouch request (no notification sent)
vouchRouter.patch(
  "/requests/:id/ignore",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid request id" });
        return;
      }

      const user = await UserModel.findById(userId).select("email mobile").lean();
      const request = await VouchRequestModel.findById(id).select("toEmail toMobile").lean();

      if (!request) {
        res.status(404).json({ error: "Request not found" });
        return;
      }

      const sentToEmail = request.toEmail && user?.email && request.toEmail === user.email;
      const sentToMobile = request.toMobile && user?.mobile && request.toMobile === user.mobile;
      if (!sentToEmail && !sentToMobile) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await VouchRequestModel.findByIdAndUpdate(id, { status: "ignored" });
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/pending-requests — vouch requests sent to the current user (matched by email or mobile)
vouchRouter.get(
  "/pending-requests",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const user = await UserModel.findById(userId).select("email mobile").lean();

      if (!user) {
        res.status(200).json({ requests: [] });
        return;
      }

      const orConditions: object[] = [];
      if (user.mobile) orConditions.push({ toMobile: user.mobile });
      if (user.email) orConditions.push({ toEmail: user.email });

      if (orConditions.length === 0) {
        res.status(200).json({ requests: [] });
        return;
      }

      const requests = await VouchRequestModel.find({
        $or: orConditions,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/notifications — in-app vouch notifications for the current user
vouchRouter.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const notifications = await VouchNotificationModel.find({ recipientUserId: userId })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({ notifications });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /vouch/notifications/read-all — mark all vouch notifications read
vouchRouter.patch(
  "/notifications/read-all",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await VouchNotificationModel.updateMany(
        { recipientUserId: userId, read: false },
        { $set: { read: true } }
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /vouch/give — record a vouch and mark the originating request as responded
vouchRouter.post(
  "/give",
  requireAuth,
  vouchGiveLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const {
        toAbn,
        toBusinessName,
        attributes,
        note,
        requestId,
        recipientName,
        recipientEmail,
        recipientMobile,
      } = req.body;

      if (requestId !== undefined) {
        if (!mongoose.isValidObjectId(requestId)) {
          res.status(400).json({ error: "Invalid requestId" });
          return;
        }
        // Verify the request was actually sent to this user
        const giver = await UserModel.findById(userId).select("email mobile").lean();
        const request = await VouchRequestModel.findById(requestId)
          .select("toEmail toMobile")
          .lean();
        if (!request) {
          res.status(404).json({ error: "Vouch request not found" });
          return;
        }
        const sentToEmail = request.toEmail && giver?.email && request.toEmail === giver.email;
        const sentToMobile = request.toMobile && giver?.mobile && request.toMobile === giver.mobile;
        if (!sentToEmail && !sentToMobile) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
      }

      const existing = await GivenVouchModel.exists({ fromUserId: userId, toAbn });
      if (existing) {
        res.status(409).json({ error: "You have already vouched for this business." });
        return;
      }

      const giver = await UserModel.findById(userId).select("name businessName").lean();
      const giverName = giver?.name ?? "Someone";
      const giverCompany = giver?.businessName ?? "";

      const vouch = await GivenVouchModel.create({
        fromUserId: userId,
        toAbn,
        toBusinessName,
        attributes,
        note: note ?? undefined,
        requestId: requestId ? new mongoose.Types.ObjectId(requestId) : undefined,
        recipientName: recipientName ?? undefined,
        recipientEmail: recipientEmail ?? undefined,
        recipientMobile: recipientMobile ?? undefined,
      });

      let vouchRequest: { fromUserId: mongoose.Types.ObjectId } | null = null;
      if (requestId) {
        vouchRequest = await VouchRequestModel.findByIdAndUpdate(
          requestId,
          { status: "responded", respondedAt: new Date() },
          { returnDocument: "after" }
        )
          .select("fromUserId")
          .lean();
        await VouchNotificationModel.updateMany(
          { requestId: new mongoose.Types.ObjectId(requestId) },
          { $set: { read: true } }
        );
      }

      const vouchCount = await GivenVouchModel.countDocuments({ toAbn });

      // Notify the requester directly when responding to a request, otherwise look up by ABN
      const recipientId = vouchRequest?.fromUserId ?? null;
      const recipient = recipientId
        ? await UserModel.findById(recipientId).select("_id pushToken").lean()
        : await UserModel.findOne({ abn: toAbn }).select("_id pushToken").lean();

      if (!recipient && recipientEmail) {
        sendVouchedForEmail(
          recipientEmail,
          recipientName ?? "there",
          giverName,
          giverCompany
        ).catch(() => {});
      }

      if (recipient && recipient._id.toString() !== userId) {
        await VouchNotificationModel.create({
          recipientUserId: recipient._id,
          type: "vouch_received",
          fromName: giverName,
          fromCompany: giverCompany,
          toBusinessName: toBusinessName ?? "",
          read: false,
        });

        const token = recipient.pushToken ?? "";
        if (Expo.isExpoPushToken(token)) {
          expo
            .sendPushNotificationsAsync([
              {
                to: token,
                title: "New vouch received",
                body: `${giverName} just vouched for ${toBusinessName ?? "your business"}.`,
                data: { type: "vouch_received" },
              },
            ])
            .catch(() => {});
        }
      }

      res.status(201).json({ vouch, vouchCount });
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/given — vouches the current user has given to others
vouchRouter.get("/given", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const vouches = await GivenVouchModel.find({ fromUserId: userId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ vouches });
  } catch (err) {
    next(err);
  }
});

// GET /vouch/received — vouches others have given to the current user's business
vouchRouter.get(
  "/received",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const user = await UserModel.findById(userId).select("abn").lean();
      if (!user?.abn) {
        res.status(200).json({ vouches: [] });
        return;
      }
      const vouches = await GivenVouchModel.find({ toAbn: user.abn })
        .sort({ createdAt: -1 })
        .lean();
      const giverIds = [...new Set(vouches.map((v) => v.fromUserId.toString()))];
      const givers = await UserModel.find({ _id: { $in: giverIds } })
        .select("name businessName")
        .lean();
      const giverMap = Object.fromEntries(givers.map((g) => [g._id.toString(), g]));
      const populated = vouches.map((v) => ({
        ...v,
        fromName: giverMap[v.fromUserId.toString()]?.name ?? "Someone",
        fromBusinessName: giverMap[v.fromUserId.toString()]?.businessName ?? "",
      }));
      res.status(200).json({ vouches: populated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/business/:abn — vouch score for a business
vouchRouter.get(
  "/business/:abn",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { abn } = req.params;
      const userId = req.user!.sub;

      // isOnVouch = business has submitted a Get Vouched profile with this ABN
      const profile = await VouchProfileModel.findOne({ abn }).lean();
      const isOnVouch = !!profile;

      const [vouches, alreadyVouched] = await Promise.all([
        GivenVouchModel.find({ toAbn: abn }).lean(),
        GivenVouchModel.exists({ fromUserId: userId, toAbn: abn }),
      ]);
      const vouchCount = vouches.length;

      if (!isOnVouch) {
        res.status(200).json({ isOnVouch: false, vouchCount, alreadyVouched: !!alreadyVouched });
        return;
      }

      const tally: Record<string, number> = {};
      for (const v of vouches) {
        for (const attr of v.attributes) {
          tally[attr] = (tally[attr] ?? 0) + 1;
        }
      }
      const top = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([attr]) => attr);

      res.status(200).json({
        isOnVouch: true,
        vouchCount,
        alreadyVouched: !!alreadyVouched,
        attributeSummary: top.length > 0 ? top.join(" · ") : undefined,
      });
    } catch (err) {
      next(err);
    }
  }
);
