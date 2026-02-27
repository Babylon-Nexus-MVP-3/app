import mongoose from "mongoose";

export async function clear(): Promise<Record<string, never>> {
  await mongoose.connection.db.dropDatabase();
  return {};
}
