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

export const requestRefreshToken = async (token: string) => {
  return await request(app).post("/auth/refresh").send({ refreshToken: token });
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

export async function requestAcceptInvite(inviteCode: string, token: string) {
  return request(app)
    .post(`/project/invite/accept`)
    .set("Authorization", `Bearer ${token}`)
    .send({ inviteCode });
}
