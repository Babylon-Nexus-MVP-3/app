import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import mongoose from "mongoose";

const PORT: number = parseInt(process.env.PORT || "3229");
const HOST: string = process.env.host || "0.0.0.0"

const server = app.listen(PORT, HOST, () => {
    console.log(`Server Listening on Port${PORT} and Host${HOST}`)
})

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("DB Connection Successful"))
    .catch((err) => console.error("DB Connection Error", err));

process.on("SIGINT", () => {
    server.close(() => {
        console.log("Server closed Gracefully");
        process.exit();
    })
})