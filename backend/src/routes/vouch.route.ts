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
import { validateEmailFormat } from "../utils/authHelper";

export const vouchRouter = express.Router();
const expo = new Expo();

// Values that end up inside a query filter must be plain strings — an object
// such as {"$ne": null} arriving in the body would otherwise be interpreted as
// a Mongo operator and match records it shouldn't.
function isQuerySafeString(value: unknown): value is string {
  return typeof value === "string";
}

// Mirrors the frontend's own check (step2.tsx) — enforced again here since the
// frontend control is trivially bypassed by calling this endpoint directly.
function isValidExpiryDate(expiry: string): boolean {
  const parts = expiry.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return false;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;
  const now = new Date();
  return (
    new Date(year, month - 1, day) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );
}

// POST /vouch/profile — save or update the logged-in user's vouch profile, then notify references
vouchRouter.post(
  "/profile",
  requireAuth,
  vouchProfileLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const body = req.body;

      const references: Array<{
        name: string;
        company: string;
        mobile: string;
        email?: string;
        relationship: string;
        project: string;
      }> = Array.isArray(req.body.references) ? req.body.references : [];

      for (const ref of references) {
        const fields = [
          ref.name,
          ref.company,
          ref.mobile,
          ref.email,
          ref.relationship,
          ref.project,
        ];
        if (fields.some((v) => v !== undefined && v !== null && !isQuerySafeString(v))) {
          res.status(400).json({ error: "Invalid reference details" });
          return;
        }
      }

      // Block vouch requests for users who haven't verified their mobile number
      if (references.length > 0) {
        const verifyUser = await UserModel.findById(userId).select("mobileVerified").lean();
        if (!verifyUser?.mobileVerified) {
          res
            .status(403)
            .json({ error: "You must verify your mobile number before requesting vouches." });
          return;
        }
      }

      // Source identity fields from DB — not the request body — to prevent impersonation
      const dbUser = await UserModel.findById(userId).select("name abn businessName").lean();
      const fromName = dbUser?.name ?? "";
      const fromAbn = dbUser?.abn ?? "";
      const fromCompany = dbUser?.businessName || "";

      // fromCompany and fromAbn are both required on VouchRequest — without this
      // guard, submitting references with either missing crashes mid-loop with a
      // raw 500 instead of a clean error.
      if (references.length > 0 && (!fromCompany || !fromAbn)) {
        res.status(400).json({
          error: "Please add your business name and ABN before requesting vouches.",
        });
        return;
      }

      // Each wizard step only sends the fields it owns, so this must be a partial
      // $set merge rather than a full-document replace — otherwise saving any one
      // step wipes out the fields collected by every other step. Steps that don't
      // own references send `references: []`; skip that field rather than letting
      // it clobber references already saved by the request-a-vouch screen.
      // Likewise, a step that bundles in another step's not-yet-filled fields
      // (e.g. step 1 always includes idNumber/idExpiry from the same local
      // object, empty until step 2 is done) sends them as "" — $set'ing an empty
      // string still trips the schema's `required: true` validator, so drop
      // empty values too.
      //
      // Only fields on this list may be written — never trust the request body's
      // key names wholesale. Without an allow-list, a body like {"userId": "<victim>"}
      // would reassign this profile document to someone else's account.
      const WRITABLE_FIELDS = [
        "name",
        "abn",
        "trade",
        "idType",
        "tradeType",
        "idNumber",
        "idExpiry",
        "idState",
      ] as const;

      if (
        typeof body.idExpiry === "string" &&
        body.idExpiry !== "" &&
        !isValidExpiryDate(body.idExpiry)
      ) {
        res.status(400).json({ error: "Enter a valid, non-expired expiry date." });
        return;
      }

      const setFields: Record<string, unknown> = { userId, submittedAt: new Date() };
      for (const key of WRITABLE_FIELDS) {
        const value = body[key];
        if (value !== "" && value !== undefined && value !== null) {
          setFields[key] = value;
        }
      }
      if (Array.isArray(body.references) && body.references.length > 0) {
        setFields.references = body.references;
      }
      setFields.userId = userId; // reassert — cannot be overridden by anything above

      const profile = await VouchProfileModel.findOneAndUpdate(
        { userId },
        { $set: setFields },
        { upsert: true, returnDocument: "after", runValidators: false }
      );

      // Pre-check: block if any reference has already given a vouch to this user.
      // The frontend always resends the full cumulative references array (no flag
      // distinguishes new vs. previously-submitted refs), so this must skip ANY
      // reference that already has a request on file, regardless of status —
      // otherwise an old, already-responded reference earlier in the array blocks
      // a brand-new reference added later before the loop ever reaches it.
      for (const ref of references) {
        if (!ref.name || !ref.mobile) continue;

        // A request the reference ignored doesn't count as "already requested" —
        // otherwise re-adding them after an ignore silently does nothing forever.
        const dupConditions: object[] = [{ toMobile: ref.mobile }];
        if (ref.email) dupConditions.push({ toEmail: ref.email });
        const alreadyRequested = await VouchRequestModel.exists({
          fromUserId: userId,
          status: { $ne: "ignored" },
          $or: dupConditions,
        });
        if (alreadyRequested) continue;

        const orConditions: object[] = [{ mobile: ref.mobile }];
        if (ref.email) orConditions.push({ email: ref.email });
        const refUser = await UserModel.findOne({ $or: orConditions }).select("_id").lean();
        if (refUser && fromAbn) {
          const alreadyVouched = await GivenVouchModel.exists({
            fromUserId: refUser._id,
            toAbn: fromAbn,
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

        // Skip if a non-ignored request was already sent to this reference — an
        // ignored one doesn't block a retry (see matching check above).
        const dupConditions: object[] = [{ toMobile: ref.mobile }];
        if (ref.email) dupConditions.push({ toEmail: ref.email });
        const existing = await VouchRequestModel.exists({
          fromUserId: userId,
          status: { $ne: "ignored" },
          $or: dupConditions,
        });
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
            fromName,
            fromCompany,
            ref.relationship,
            ref.project
          ).catch(() => {});
        }
      }

      // Keep UserModel in sync so Give a Vouch notifications work — only when
      // there's an ABN to sync, and only when it isn't already someone else's
      // (received-vouches are looked up purely by ABN, so writing an unvalidated
      // one would let a caller display another business's reputation as their own).
      if (body.abn) {
        const existingAbnOwner = await UserModel.findOne({ abn: body.abn }).select("_id").lean();
        if (existingAbnOwner && existingAbnOwner._id.toString() !== userId) {
          res.status(400).json({
            error:
              "This ABN is already registered to another account. If you believe this is a mistake, contact support@vouchpay.app.",
          });
          return;
        }
        await UserModel.findByIdAndUpdate(userId, {
          abn: body.abn,
          ...(body.trade || body.name ? { businessName: body.trade ?? body.name } : {}),
        });
      }

      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/profile/me — retrieve the logged-in user's vouch profile + server-computed strength
vouchRouter.get(
  "/profile/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const [profile, dbUser] = await Promise.all([
        VouchProfileModel.findOne({ userId }),
        UserModel.findById(userId).select("name abn businessTrade").lean(),
      ]);

      // Step 1 is complete if the user has name/ABN/trade — sourced from the
      // User record (set at sign-up) so it counts even before the wizard is opened.
      const step1Done = !!(dbUser?.name && dbUser?.abn && dbUser?.businessTrade);
      const step2Done = !!profile?.idNumber;

      // Only facts about the user themselves count. Vouches received depend on
      // other people responding, and project membership comes and goes — neither
      // belongs in a score that gates what the user can do.
      const STEP_PCT = [50, 50];
      const stepsDone = [step1Done, step2Done];
      const profileStrength = stepsDone.reduce((acc, done, i) => acc + (done ? STEP_PCT[i] : 0), 0);

      res.status(200).json({
        ...(profile ? profile.toObject() : {}),
        profileStrength,
        stepsDone,
      });
    } catch (err) {
      next(err);
    }
  }
);

// How long a reference gets before they can be nudged again.
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// How long a request sits unanswered before we remind the sender to nudge.
const NUDGE_REMINDER_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

// POST /vouch/requests/:requestId/nudge — remind a reference who hasn't responded
vouchRouter.post(
  "/requests/:requestId/nudge",
  requireAuth,
  vouchProfileLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { requestId } = req.params;

      if (!mongoose.isValidObjectId(requestId)) {
        res.status(400).json({ error: "Invalid request id" });
        return;
      }

      // Scoped to the caller so one user can't nudge on another's behalf.
      const request = await VouchRequestModel.findOne({ _id: requestId, fromUserId: userId });
      if (!request) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      if (request.status !== "pending") {
        res.status(400).json({ error: "That request has already been answered." });
        return;
      }

      // A reminder is a message to someone else's phone, so it's rate limited
      // per request rather than only per user.
      const lastSent = request.lastSentAt ?? request.createdAt;
      const waitedMs = Date.now() - new Date(lastSent).getTime();
      if (waitedMs < NUDGE_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((NUDGE_COOLDOWN_MS - waitedMs) / (60 * 60 * 1000));
        res.status(429).json({
          error: `You can nudge them again in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`,
          hoursLeft,
        });
        return;
      }

      // Re-notify through every channel the original request used.
      const orConditions: object[] = [{ mobile: request.toMobile }];
      if (request.toEmail) orConditions.push({ email: request.toEmail });
      const refUser = await UserModel.findOne({ $or: orConditions }).select("_id pushToken").lean();

      if (refUser) {
        await VouchNotificationModel.create({
          recipientUserId: refUser._id,
          requestId: request._id,
          fromName: request.fromName,
          fromCompany: request.fromCompany,
          projectName: request.projectName,
        });

        const token = refUser.pushToken;
        if (token && Expo.isExpoPushToken(token)) {
          expo
            .sendPushNotificationsAsync([
              {
                to: token,
                title: "Nudge: vouch request",
                body: `${request.fromName} from ${request.fromCompany} is still waiting on your vouch.`,
                data: { type: "VouchRequest", requestId: request._id.toString() },
              },
            ])
            .catch(() => {});
        }
      }

      if (request.toEmail) {
        sendVouchRequestEmail(
          request.toEmail,
          request.fromName,
          request.fromCompany,
          request.relationship,
          request.projectName
        ).catch(() => {});
      }

      request.lastSentAt = new Date();
      // They've nudged, so stop reminding them to.
      request.lastNudgeReminderAt = new Date();
      await request.save();

      await VouchNotificationModel.deleteMany({
        recipientUserId: userId,
        requestId: request._id,
        type: "nudge_reminder",
      });

      res.status(200).json({ success: true, lastSentAt: request.lastSentAt });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /vouch/requests/:requestId — withdraw a request the reference hasn't answered
vouchRouter.delete(
  "/requests/:requestId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { requestId } = req.params;

      if (!mongoose.isValidObjectId(requestId)) {
        res.status(400).json({ error: "Invalid request id" });
        return;
      }

      const request = await VouchRequestModel.findOne({ _id: requestId, fromUserId: userId });
      if (!request) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      // A given vouch belongs to the person who gave it — withdrawing the ask
      // afterwards would be rewriting their record, so only pending ones go.
      if (request.status !== "pending") {
        res.status(400).json({ error: "That request has already been answered." });
        return;
      }

      // Take it out of the reference's inbox too, so they aren't asked for
      // something that no longer stands.
      await VouchNotificationModel.deleteMany({ requestId: request._id });
      await request.deleteOne();

      res.status(200).json({ success: true });
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

/**
 * Remind the sender to nudge references who have gone quiet.
 *
 * Generated when the user reads their notifications rather than by a scheduler:
 * there is no job runner in this service, and a reminder is only useful at the
 * moment someone is looking at the app anyway. `lastNudgeReminderAt` keeps it
 * to one reminder per request per interval.
 */
async function createNudgeReminders(userId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - NUDGE_REMINDER_AFTER_MS);

  const stale = await VouchRequestModel.find({
    fromUserId: userId,
    status: "pending",
    lastSentAt: { $lt: staleBefore },
    $or: [
      { lastNudgeReminderAt: { $exists: false } },
      { lastNudgeReminderAt: { $lt: staleBefore } },
    ],
  })
    .select("_id toEmail toMobile relationship")
    .lean();

  for (const request of stale) {
    await VouchNotificationModel.create({
      recipientUserId: userId,
      type: "nudge_reminder",
      requestId: request._id,
      fromName: request.toEmail || request.toMobile,
      fromCompany: request.relationship ?? "",
      read: false,
    });
    await VouchRequestModel.updateOne(
      { _id: request._id },
      { $set: { lastNudgeReminderAt: new Date() } }
    );
  }
}

// GET /vouch/notifications — in-app vouch notifications for the current user
vouchRouter.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      await createNudgeReminders(userId);

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

// PATCH /vouch/notifications/:id/read — mark a single notification as read
vouchRouter.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ error: "Invalid notification id" });
        return;
      }
      await VouchNotificationModel.updateOne(
        { _id: id, recipientUserId: userId },
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

      if (!isQuerySafeString(toAbn)) {
        res.status(400).json({ error: "Invalid ABN" });
        return;
      }

      const giver = await UserModel.findById(userId)
        .select("email mobile abn name businessName businessTrade")
        .lean();

      // Giving a vouch puts your name behind someone else's work, so the giver
      // must have completed their own profile first — the same two things the
      // "build your profile" flow asks for. Receiving a vouch stays open to
      // everyone; only giving one is gated.
      const giverProfile = await VouchProfileModel.findOne({ userId }).select("idNumber").lean();
      const giverProfileComplete = !!(
        giver?.name &&
        giver?.abn &&
        giver?.businessTrade &&
        giverProfile?.idNumber
      );
      if (!giverProfileComplete) {
        res.status(403).json({
          error: "Complete your profile — your details and trade licence — before giving a vouch.",
        });
        return;
      }

      if (giver?.abn && giver.abn === toAbn) {
        res.status(400).json({ error: "You cannot vouch for your own business." });
        return;
      }

      if (requestId !== undefined) {
        if (!mongoose.isValidObjectId(requestId)) {
          res.status(400).json({ error: "Invalid requestId" });
          return;
        }
        // Verify the request was actually sent to this user
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

      let vouchRequest: {
        _id: mongoose.Types.ObjectId;
        fromUserId: mongoose.Types.ObjectId;
      } | null = null;
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
      } else {
        // Vouching via ABN search instead of tapping a pending-request card still
        // counts as responding to that request if one exists — otherwise the
        // requester's profile strength stays stuck even though the vouch happened.
        const orConditions: object[] = [];
        if (giver?.email) orConditions.push({ toEmail: giver.email });
        if (giver?.mobile) orConditions.push({ toMobile: giver.mobile });
        if (orConditions.length > 0) {
          vouchRequest = await VouchRequestModel.findOneAndUpdate(
            { fromAbn: toAbn, status: "pending", $or: orConditions },
            { status: "responded", respondedAt: new Date() },
            { returnDocument: "after" }
          )
            .select("fromUserId")
            .lean();
          if (vouchRequest) {
            await VouchNotificationModel.updateMany(
              { requestId: vouchRequest._id },
              { $set: { read: true } }
            );
          }
        }
      }

      const vouchCount = await GivenVouchModel.countDocuments({ toAbn });

      // Notify the requester directly when responding to a request, otherwise look up by ABN
      const recipientId = vouchRequest?.fromUserId ?? null;
      const recipient = recipientId
        ? await UserModel.findById(recipientId).select("_id pushToken").lean()
        : await UserModel.findOne({ abn: toAbn }).select("_id pushToken").lean();

      if (!recipient && recipientEmail) {
        try {
          const safeRecipientEmail = validateEmailFormat(recipientEmail);
          sendVouchedForEmail(
            safeRecipientEmail,
            recipientName ?? "there",
            giverName,
            giverCompany,
            attributes ?? [],
            note
          ).catch(() => {});
        } catch {
          // Malformed recipientEmail — skip the notification rather than fail the vouch
        }
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
        .select("name businessName abn")
        .lean();
      const giverMap = Object.fromEntries(givers.map((g) => [g._id.toString(), g]));

      const giverAbns = givers.map((g) => g.abn).filter(Boolean) as string[];
      const vouchedBackDocs = await GivenVouchModel.find({
        fromUserId: userId,
        toAbn: { $in: giverAbns },
      })
        .select("toAbn")
        .lean();
      const vouchedBackSet = new Set(vouchedBackDocs.map((v) => v.toAbn));

      const populated = vouches.map((v) => {
        const giver = giverMap[v.fromUserId.toString()];
        const fromAbn = giver?.abn ?? "";
        return {
          ...v,
          fromName: giver?.name ?? "Someone",
          fromBusinessName: giver?.businessName ?? "",
          fromAbn,
          alreadyVouchedBack: !!(fromAbn && vouchedBackSet.has(fromAbn)),
        };
      });
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
      const attributes = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .map(([attr, count]) => ({ attr, count }));

      res.status(200).json({
        isOnVouch: true,
        vouchCount,
        alreadyVouched: !!alreadyVouched,
        attributeSummary:
          attributes.length > 0
            ? attributes
                .slice(0, 3)
                .map((a) => a.attr)
                .join(" · ")
            : undefined,
        attributes,
      });
    } catch (err) {
      next(err);
    }
  }
);
