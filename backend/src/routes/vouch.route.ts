import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Expo from "expo-server-sdk";
import { requireAuth } from "../middleware";
import { VouchProfileModel } from "../models/vouchProfileModel";
import { VouchRequestModel } from "../models/vouchRequestModel";
import { GivenVouchModel } from "../models/givenVouchModel";
import { VouchNotificationModel } from "../models/vouchNotificationModel";
import { UserModel } from "../models/userModel";
import { sendVouchRequestEmail } from "../service/email.service";

export const vouchRouter = express.Router();
const expo = new Expo();

function normalizeAuMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+61${digits.slice(1)}`;
  if (digits.length === 9) return `+61${digits}`;
  return `+${digits}`;
}

// POST /vouch/profile — save or update the logged-in user's vouch profile, then notify references
vouchRouter.post(
  "/profile",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const body = req.body;

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

      for (const ref of references) {
        if (!ref.name || !ref.mobile) continue;

        const normalizedMobile = normalizeAuMobile(ref.mobile);
        const normalizedEmail = ref.email?.trim().toLowerCase() ?? "";

        const request = await VouchRequestModel.create({
          fromUserId: userId,
          fromName: body.name,
          fromCompany,
          fromAbn: body.abn ?? "",
          toEmail: normalizedEmail,
          toMobile: normalizedMobile,
          relationship: ref.relationship,
          projectName: ref.project,
          status: "pending",
        });

        // Find the reference's user account — match by either mobile or email
        const orConditions: object[] = [{ mobile: normalizedMobile }];
        if (normalizedEmail) orConditions.push({ email: normalizedEmail });

        const refUser = await UserModel.findOne({ $or: orConditions })
          .select("_id pushToken")
          .lean();

        if (refUser) {
          // In-app notification
          await VouchNotificationModel.create({
            recipientUserId: refUser._id,
            requestId: request._id,
            fromName: body.name,
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
                  body: `${body.name} from ${fromCompany} has asked you to vouch for them.`,
                  data: { type: "VouchRequest", requestId: request._id.toString() },
                },
              ])
              .catch(() => {});
          }
        }

        // Email notification — sent regardless of whether reference is on VouchPay
        if (normalizedEmail) {
          sendVouchRequestEmail(
            normalizedEmail,
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
      const requests = await VouchRequestModel.find({ fromUserId: userId })
        .sort({ createdAt: -1 })
        .lean();
      res.status(200).json({ requests });
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
vouchRouter.post("/give", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const { toAbn, toBusinessName, attributes, note, requestId } = req.body;

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
});

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
