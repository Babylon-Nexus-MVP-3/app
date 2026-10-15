import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import { app } from "./app";
import { startNotificationScheduler } from "./service/notificationScheduler.service";
import { Server } from "http";

const PORT: number = parseInt(process.env.PORT || "3229");
// HOST is the documented name. The lowercase `host` is what this used to read,
// so it's still honoured in case an existing .env sets it.
const HOST: string = process.env.HOST || process.env.host || "0.0.0.0";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

let server: Server | null = null;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("DB Connection Successful");
    startNotificationScheduler();
    server = app.listen(PORT, HOST, () => {
      console.log(`Server listening on ${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB Connection Error", err);
    process.exit(1);
  });

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    if (!server) {
      process.exit(0);
    }

    server.close(() => {
      console.log("Server closed Gracefully");
      process.exit();
    });
  });
});
