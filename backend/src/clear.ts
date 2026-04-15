import { UserModel } from "./models/userModel";
import { ProjectModel } from "./models/projectModel";
import { ProjectParticipantModel } from "./models/projectParticipantModel";
import { NotificationModel } from "./models/notificationModel";
import { RefreshTokenModel } from "./models/refreshTokenModel";
import { EventModel } from "./models/eventModel";
import { InvoiceModel } from "./models/invoiceModel";
import { CounterModel } from "./models/counterModel";

/*
  Clears all collections. Used exclusively in test environments to reset state between tests.
  Uses deleteMany per collection instead of dropDatabase to avoid a race condition where
  MongoDB's async drop is still in progress when the next test creates documents.
  Should never be called in production.
*/
export async function clear(): Promise<Record<string, never>> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("clear() cannot be called in production");
  }

  await Promise.all([
    UserModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    ProjectParticipantModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
    EventModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    CounterModel.deleteMany({}),
  ]);

  return {};
}
