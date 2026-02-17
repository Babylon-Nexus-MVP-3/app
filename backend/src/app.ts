import express, { json, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";

export const app = express();

app.use(json());
app.use(morgan("dev"))
app.use(cors());

