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
  email: string,
  role?: string
) => {
  const body: Record<string, string> = { firstName, lastName, password, email };
  if (role) body.role = role;
  return await request(app).post("/auth/register").send(body);
};

export const requestAuthLogin = async (email: string, password: string) => {
  return await request(app).post("/auth/login").send({ email, password });
};

export const requestInviteSubbie = async (
  projectId: string,
  token: string,
  email: string,
  trade: string,
  role: string
) => {
  return await request(app)
    .post(`/project/${projectId}/invite`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: email,
      trade: trade,
      role: role,
    });
};
