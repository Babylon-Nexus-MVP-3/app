import request from "supertest";
import { app } from "../app";

// Clear
export const requestDelete = async () => {
  return await request(app).delete("/clear");
};

// Auth
export const requestAuthRegister = async (
  firstName: string,
  lastName: string,
  password: string,
  email: string
) => {
  return await request(app).post("/auth/register").send({ firstName, lastName, password, email });
};
