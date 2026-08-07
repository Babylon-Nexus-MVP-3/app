import express, { json, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import path from "path";
import fs from "fs";
import { authRouter } from "./routes/auth.route";
import { projectRouter } from "./routes/project.route";
import { projectsRouter } from "./routes/projects.route";
import { adminRouter } from "./routes/admin.route";
import { notificationRouter } from "./routes/notification.route";
import { abrRouter } from "./routes/abr.route";
import { vouchRouter } from "./routes/vouch.route";
import { clear } from "./clear";

export const app = express();

app.set("trust proxy", 1);
app.use(json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(helmet());

// Native clients send no Origin header and are unaffected by CORS. Browser
// origins (Expo web, admin console) must be listed in CORS_ORIGINS — a
// comma-separated list — rather than reflected back blindly.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// Render API Documentation
// Protect API Documentation from being exposed in production.
if (process.env.NODE_ENV !== "production") {
  const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
  const swaggerDoc = YAML.parse(swaggerFile);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

  // Utility endpoint for testing — only available in test and development environments
  app.delete("/clear", async (_req: Request, res: Response) => {
    try {
      const result = await clear();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}

app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use("/auth", authRouter);
app.use("/project", projectRouter);
app.use("/projects", projectsRouter);
app.use("/admin", adminRouter);
app.use("/notifications", notificationRouter);
app.use("/abr", abrRouter);
app.use("/vouch", vouchRouter);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ success: true });
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
