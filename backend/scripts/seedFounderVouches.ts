/**
 * Creates a real, mutual vouch exchange between the two founder accounts
 * (bal@ladder.inc, tom@chengdarcy.com.au) so each has a "responded" vouch
 * request and a real GivenVouch record — unlocking "Give a Vouch" for both
 * (which requires respondedCount >= 1) and starting the vouch chain.
 *
 * Editing VouchProfile.references directly (seedFounderProfiles.ts) only
 * satisfies the profile-completeness gate; it doesn't create the
 * VouchRequest/GivenVouch records that "Give a Vouch" actually checks.
 *
 * Safe to re-run: skips any direction that already has a GivenVouch record.
 */
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../src/models/userModel";
import { VouchRequestModel } from "../src/models/vouchRequestModel";
import { GivenVouchModel } from "../src/models/givenVouchModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI as string;
const ATTRIBUTES = ["Reliable", "Professional", "Work with again"];

async function main() {
  await mongoose.connect(MONGODB_URI);

  const bal = await UserModel.findOne({ email: "bal@ladder.inc" });
  const tom = await UserModel.findOne({ email: "tom@chengdarcy.com.au" });
  if (!bal || !tom) throw new Error("Could not find bal or tom");
  if (!bal.abn || !tom.abn) throw new Error("Missing abn on bal or tom");

  async function createMutualVouch(
    requester: typeof bal,
    giver: typeof tom,
    giverBusinessName: string
  ) {
    const existing = await GivenVouchModel.exists({
      fromUserId: giver._id,
      toAbn: requester.abn,
    });
    if (existing) {
      console.log(`Skipping — ${giver.name} already vouched for ${requester.name}`);
      return;
    }

    const request = await VouchRequestModel.create({
      fromUserId: requester._id,
      fromName: requester.name,
      fromCompany: giverBusinessName,
      fromAbn: requester.abn,
      toEmail: giver.email ?? "",
      toMobile: giver.mobile ?? "",
      relationship: "Worked together",
      projectName: "",
      status: "responded",
      respondedAt: new Date(),
    });

    await GivenVouchModel.create({
      fromUserId: giver._id,
      toAbn: requester.abn,
      toBusinessName: giverBusinessName,
      attributes: ATTRIBUTES,
      requestId: request._id,
      recipientName: requester.name,
      recipientEmail: requester.email,
      recipientMobile: requester.mobile,
    });

    console.log(`${giver.name} vouched for ${requester.name}`);
  }

  await createMutualVouch(bal, tom, "Ladder");
  await createMutualVouch(tom, bal, "Cheng Darcy");

  for (const user of [bal, tom]) {
    const respondedCount = await VouchRequestModel.countDocuments({
      fromUserId: user._id,
      status: "responded",
    });
    console.log(`${user.email} respondedCount = ${respondedCount}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
