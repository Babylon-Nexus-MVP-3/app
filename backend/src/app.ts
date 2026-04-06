import express, { json, Request, Response, NextFunction } from "express";
import cors from "cors";
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
import { clear } from "./clear";

export const app = express();

app.use(json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  cors({
    credentials: true,
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

app.use("/auth", authRouter);
app.use("/project", projectRouter);
app.use("/projects", projectsRouter);
app.use("/admin", adminRouter);
app.use("/notifications", notificationRouter);

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
