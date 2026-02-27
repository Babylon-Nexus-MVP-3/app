import mongoose from "mongoose";

/*
  Drops the entire database. Used exclusively in test environments to reset state between tests.
  Should never be called in production.
*/
export async function clear(): Promise<Record<string, never>> {
  await mongoose.connection.db.dropDatabase();
  return {};
}
