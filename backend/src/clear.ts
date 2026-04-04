import mongoose from "mongoose";

/*
  Drops the entire database. Used exclusively in test environments to reset state between tests.
  Should never be called in production.
*/
export async function clear(): Promise<Record<string, never>> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("clear() cannot be called in production");
  }

  if (!mongoose.connection.db) {
    throw new Error("Database connection is not established");
  }

  await mongoose.connection.db.dropDatabase();
  return {};
}
