import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import mongoose from "mongoose";
import { startNotificationScheduler } from "./service/notificationScheduler.service";

const PORT: number = parseInt(process.env.PORT || "3229");
const HOST: string = process.env.host || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("DB Connection Successful");
    startNotificationScheduler();
  })
  .catch((err) => console.error("DB Connection Error", err));

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    server.close(() => {
      console.log("Server closed Gracefully");
      process.exit();
    });
  });
});
