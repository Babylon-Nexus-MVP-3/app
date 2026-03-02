import express, { json, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/authRoutes";
import { AuthError } from "./services/authService";

export const app = express();

app.use(json());
app.use(morgan("dev"));
app.use(cors());

// Render API Documentation
const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
const swaggerDoc = YAML.parse(swaggerFile);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Fallback error handler for unexpected errors
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
