import express, { json, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import path from "path";
import fs from "fs";
import { authRouter } from "./routes/auth.route";
import { clear } from "./clear";

export const app = express();

app.use(json());
app.use(morgan("dev"));
app.use(cors());

// Render API Documentation
const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
const swaggerDoc = YAML.parse(swaggerFile);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Utility endpoint for testing
app.delete("/clear", async (req: Request, res: Response) => {
  try {
    const result = await clear();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const maybeErr = err as { statusCode?: number; message?: string };

  if (
    typeof maybeErr.statusCode === "number" &&
    maybeErr.statusCode >= 400 &&
    maybeErr.statusCode < 600
  ) {
    res.status(maybeErr.statusCode).json({ error: maybeErr.message ?? "Request failed" });
    return;
  }

  // Fallback error handler for unexpected errors

  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
