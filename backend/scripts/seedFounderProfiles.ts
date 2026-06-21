/**
 * Completes the remaining profile steps for the two founder accounts
 * (bal@ladder.inc, tom@chengdarcy.com.au) so their profile strength hits
 * 100% — they're meant to start the vouch chain for everyone else.
 *
 * Both already had steps 1, 2, 3, and 6 done. This fills in:
 *   - step 4 (second reference) for both — they vouch for each other
 *   - step 5 (past project) for Bal only — Tom already had this
 *
 * Safe to re-run: only $set's the specific missing fields.
 */
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../src/models/userModel";
import { VouchProfileModel } from "../src/models/vouchProfileModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI as string;

async function main() {
  await mongoose.connect(MONGODB_URI);

  const bal = await UserModel.findOne({ email: "bal@ladder.inc" });
  const tom = await UserModel.findOne({ email: "tom@chengdarcy.com.au" });

  if (!bal || !tom) {
    throw new Error("Could not find bal@ladder.inc or tom@chengdarcy.com.au");
  }

  const balProfile = await VouchProfileModel.findOne({ userId: bal._id });
  const tomProfile = await VouchProfileModel.findOne({ userId: tom._id });

  if (!balProfile || !tomProfile) {
    throw new Error("Missing VouchProfile for bal or tom");
  }

  // Bal references Tom, Tom references Bal — the two founders vouching for
  // each other as the second reference.
  const tomAsRef = {
    name: tom.name,
    company: "Cheng Darcy",
    mobile: tom.mobile ?? "",
    email: tom.email,
    relationship: "Worked together",
    project: "",
  };
  const balAsRef = {
    name: bal.name,
    company: "Ladder",
    mobile: bal.mobile ?? "",
    email: bal.email,
    relationship: "Worked together",
    project: "",
  };

  await VouchProfileModel.updateOne(
    { _id: balProfile._id },
    {
      $set: {
        references: [...balProfile.references, tomAsRef],
        pastProjectName: balProfile.pastProjectName || "Foreshore Apartments",
        pastSuburb: balProfile.pastSuburb || "Hshhs",
        pastState: balProfile.pastState || "NSW",
        pastPostcode: balProfile.pastPostcode || "2060",
        pastMonthYear: balProfile.pastMonthYear || "2024",
        pastValue: balProfile.pastValue || "480000",
      },
    }
  );

  await VouchProfileModel.updateOne(
    { _id: tomProfile._id },
    { $set: { references: [...tomProfile.references, balAsRef] } }
  );

  console.log("Done. Verifying...");

  for (const [label, userId] of [
    ["bal@ladder.inc", bal._id],
    ["tom@chengdarcy.com.au", tom._id],
  ] as const) {
    const p = await VouchProfileModel.findOne({ userId }).lean();
    const step1 = !!(p?.name && p?.abn && p?.trade);
    const step2 = !!(p?.currentProjectName && p?.suburb && p?.state);
    const r0 = p?.references?.[0];
    const r1 = p?.references?.[1];
    const step3 = !!(r0?.name && r0?.company && r0?.mobile && r0?.relationship);
    const step4 = !!(r1?.name && r1?.company && r1?.mobile && r1?.relationship);
    const step5 = !!(p?.pastProjectName && p?.pastSuburb && p?.pastState);
    const step6 = !!p?.idNumber;
    console.log(label, { step1, step2, step3, step4, step5, step6 });
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
