import express, { json, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import path from "path";
import fs from "fs";

export const app = express();

app.use(json());
app.use(morgan("dev"));
app.use(cors());

// Render API Documentation
const swaggerFile = fs.readFileSync(path.join(__dirname, "../swagger.yaml"), "utf8");
const swaggerDoc = YAML.parse(swaggerFile);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});
