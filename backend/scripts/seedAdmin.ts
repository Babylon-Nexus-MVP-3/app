/**
 * Seeds the first platform admin user. Admins cannot self-sign-up; they must be seeded.
 * Requires ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in env (or .env).
 * Safe to run multiple times: skips if an admin with the given email already exists.
 */
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../src/models/userModel";
import { hashInfo } from "../src/utils/authHelper";

dotenv.config({ path: path.join(__dirname, "../.env") });

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";

async function seedAdmin(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      "Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env to seed the first admin."
    );
    process.exit(1);
  }

  const email = ADMIN_EMAIL.toLowerCase().trim();
  if (ADMIN_PASSWORD.length < 8) {
    console.error("ADMIN_SEED_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    const existing = await UserModel.findOne({ email, role: "Admin" });
    if (existing) {
      console.log(`Admin with email ${email} already exists. Skipping.`);
      return;
    }

    const hashedPassword = await hashInfo(ADMIN_PASSWORD);
    await UserModel.create({
      name: "Platform Admin",
      email,
      password: hashedPassword,
      role: "Admin",
      status: "Active",
      emailVerified: true,
    });

    console.log(`Admin user created: ${email}`);
  } catch (err) {
    console.error("Failed to seed admin user", err);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(process.exitCode ?? 0);
  }
}

seedAdmin().catch((err) => {
  console.error("Unexpected error while seeding admin", err);
  process.exit(1);
});
