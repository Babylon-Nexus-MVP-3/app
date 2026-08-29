import { UserModel } from "../models/userModel";
import { VouchProfileModel } from "../models/vouchProfileModel";

/*
  The single source of truth for "how complete is this user's vouch profile".

  Every gate in the app — the strength meter, project creation, giving a vouch —
  must go through here. Previously the same rule was re-derived at each call
  site, and the copies drifted: one screen still assumed five steps worth 20%
  each and told users they had three things left to do when they had one.

  Only facts about the user themselves count. Vouches received depend on other
  people responding, and project membership comes and goes — neither belongs in
  a score that gates what the user can do.
*/

// What each step contributes. Length defines how many steps exist; the values
// must sum to 100.
export const STEP_PCT = [50, 50] as const;

export const STEP_COUNT = STEP_PCT.length;

export interface ProfileCompletion {
  /** Per-step completion, index-aligned with STEP_PCT. */
  stepsDone: boolean[];
  /** How many steps are still outstanding. */
  stepsLeft: number;
  /** 0–100, the sum of the completed steps' weights. */
  profileStrength: number;
  /** True only at 100% — the gate for giving a vouch and creating a project. */
  isComplete: boolean;
}

/*
  Turns raw step results into the derived numbers, so callers never compute a
  percentage or a step count themselves.
*/
export function summariseSteps(stepsDone: boolean[]): ProfileCompletion {
  const profileStrength = stepsDone.reduce(
    (acc, done, i) => acc + (done ? (STEP_PCT[i] ?? 0) : 0),
    0
  );

  return {
    stepsDone,
    stepsLeft: stepsDone.filter((done) => !done).length,
    profileStrength,
    isComplete: profileStrength === 100,
  };
}

/*
  Loads the user's records and evaluates both steps.

  Step 1 (your details) reads from the User record rather than the VouchProfile
  because those fields are set at sign-up — they count even if the wizard has
  never been opened. Step 2 (trade licence) is the wizard's own output.
*/
export async function getProfileCompletion(userId: string): Promise<ProfileCompletion> {
  const [profile, dbUser] = await Promise.all([
    VouchProfileModel.findOne({ userId }).select("idNumber").lean(),
    UserModel.findById(userId).select("firstName lastName abn businessTrade").lean(),
  ]);

  const step1Done = !!(dbUser?.firstName && dbUser?.abn && dbUser?.businessTrade);
  const step2Done = !!profile?.idNumber;

  return summariseSteps([step1Done, step2Done]);
}
