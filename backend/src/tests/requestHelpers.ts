import request from "supertest";
import { app } from "../app";
import { UserModel } from "../models/userModel";

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

export const requestForgotPassword = async (email: string) => {
  return await request(app).post("/auth/forgot-password").send({ email });
};

export const requestResendResetCode = async (email: string) => {
  return await request(app).post("/auth/resend-reset-code").send({ email });
};

export const requestVerifyResetCode = async (resetCode: string) => {
  return await request(app).post("/auth/verify-reset-code").send({ resetCode });
};

export const resetPassword = async (resetCode: string, newPassword: string) => {
  return await request(app).post("/auth/reset-password").send({ resetCode, newPassword });
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

export async function requestSubmitInvoice(
  token: string,
  projectId: string,
  submittingParty: string,
  submittingCategory: string,
  dateDue: Date,
  description: string,
  amount: number
) {
  return request(app)
    .post(`/project/${projectId}/invoice`)
    .send({ submittingParty, submittingCategory, dateDue, description, amount })
    .set("Authorization", `Bearer ${token}`);
}
/** Register a PM user, activate them so login succeeds, then login and return access token */
export async function getPmToken(pmEmail: string, pmPassword: string): Promise<string> {
  const reg = await requestAuthRegister("Project", "Manager", pmPassword, pmEmail, "PM");
  expect(reg.status).toBe(201);
  await UserModel.updateOne(
    { email: pmEmail },
    { $set: { status: "Active", emailVerified: true } }
  );
  const login = await requestAuthLogin(pmEmail, pmPassword);
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeDefined();
  return login.body.accessToken;
}

/** Register a Subbie user, activate them, login and return access token */
export async function getSubbieToken(email: string, password: string): Promise<string> {
  const reg = await requestAuthRegister("Sub", "Contractor", password, email, "Subbie");
  expect(reg.status).toBe(201);
  await UserModel.updateOne({ email: email }, { $set: { status: "Active", emailVerified: true } });
  const login = await requestAuthLogin(email, password);
  expect(login.status).toBe(200);
  return login.body.accessToken;
}

export const validProjectBody = {
  location: "2-4 Mintaro Ave, Strathfield 2135 (Lot 1, DP: 954705)",
  council: "Strathfield",
  status: "90% Complete",
};

export async function getProjectId(token: string, email: string): Promise<string> {
  const pmUser = await UserModel.findOne({ email });
  const body = { ...validProjectBody, pmId: pmUser!._id.toString() };

  const projectRes = await request(app)
    .post("/project")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

  return projectRes.body.projectId as string;
}
