import mongoose from "mongoose";
import { runOverdueInvoiceEscalations } from "./src/service/notification.service";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const n = await runOverdueInvoiceEscalations();
  console.log("Notifications created:", n);
  await mongoose.disconnect();
}

main().catch(console.error);
