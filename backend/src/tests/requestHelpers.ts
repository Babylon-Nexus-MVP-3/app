import request from "supertest";
import { app } from "../app";
import { UserModel, UserRole } from "../models/userModel";

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
  const body: Record<string, string> = { firstName, lastName, password, email };
  return await request(app).post("/auth/register").send(body);
};

export const requestVerifyEmail = async (verificationCode: string) => {
  return await request(app).post("/auth/verify-email").send({ verificationCode });
};

export const requestResendVerification = async (email: string) => {
  return await request(app).post("/auth/resend-verification").send({ email });
};

export const requestAuthLogin = async (email: string, password: string) => {
  return await request(app).post("/auth/login").send({ email, password });
};

export const requestRefreshToken = async (token: string) => {
  return await request(app).post("/auth/refresh").send({ refreshToken: token });
};

export async function requestReactivateAccount(email: string, password: string) {
  return request(app).post("/auth/reactivate").send({ email, password });
}

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

export const requestChangePassword = async (
  token: string,
  currentPassword: string,
  newPassword: string
) => {
  return await request(app)
    .post("/auth/change-password")
    .send({ currentPassword, newPassword })
    .set("Authorization", `Bearer ${token}`);
};

export const requestLogout = async (token: string) => {
  return await request(app).post("/auth/logout").set("Authorization", `Bearer ${token}`);
};

export const requestDeleteAccount = async (token: string) => {
  return await request(app).delete("/auth/delete-account").set("Authorization", `Bearer ${token}`);
};

export const requestInvite = async (
  projectId: string,
  token: string,
  email: string,
  role: string,
  trade?: string
) => {
  return await request(app)
    .post(`/project/${projectId}/invite`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: email,
      role: role,
      trade: trade,
    });
};

export async function requestApproveInvoice(token: string, projectId: string, invoiceId: string) {
  return request(app)
    .patch(`/project/${projectId}/invoice/${invoiceId}/approve`)
    .set("Authorization", `Bearer ${token}`);
}

export async function requestMarkPaid(token: string, projectId: string, invoiceId: string) {
  return request(app)
    .patch(`/project/${projectId}/invoice/${invoiceId}/paid`)
    .set("Authorization", `Bearer ${token}`);
}

export async function requestMarkReceived(token: string, projectId: string, invoiceId: string) {
  return request(app)
    .patch(`/project/${projectId}/invoice/${invoiceId}/received`)
    .set("Authorization", `Bearer ${token}`);
}

export async function requestRejectInvoice(
  token: string,
  projectId: string,
  invoiceId: string,
  rejectionReason?: string
) {
  return request(app)
    .patch(`/project/${projectId}/invoice/${invoiceId}/reject`)
    .set("Authorization", `Bearer ${token}`)
    .send(rejectionReason ? { rejectionReason } : {});
}

export async function requestAcceptInvite(
  inviteCode: string,
  token: string,
  input?: { hasInsurance?: boolean | null; hasLicence?: boolean | null }
) {
  const hasInsurance = input?.hasInsurance === undefined ? false : input.hasInsurance;
  const hasLicence = input?.hasLicence === undefined ? false : input.hasLicence;
  return request(app)
    .post(`/project/accept`)
    .set("Authorization", `Bearer ${token}`)
    .send({ inviteCode, hasInsurance, hasLicence });
}

export async function requestSubmitInvoice(
  token: string,
  projectId: string,
  submittingParty: string,
  submittingCategory: string,
  description: string,
  amount: number
) {
  return request(app)
    .post(`/project/${projectId}/invoice`)
    .send({ submittingParty, submittingCategory, description, amount })
    .set("Authorization", `Bearer ${token}`);
}

export async function requestDeleteProject(token: string, projectId: string) {
  return request(app)
    .delete(`/admin/projects/${projectId}`)
    .set("Authorization", `Bearer ${token}`);
}

export async function getToken(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<string> {
  const reg = await requestAuthRegister(firstName, lastName, password, email);

  expect(reg.status).toBe(201);
  await verifyEmail(email, reg.body.code);

  const login = await requestAuthLogin(email, password);
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeDefined();
  return login.body.accessToken;
}

export async function verifyEmail(email: string, verificationCode: string) {
  const response = await requestVerifyEmail(verificationCode);
  expect(response.statusCode).toBe(200);

  // Verify user is actually verified from db
  const updatedUser = await UserModel.findOne({ email: email });
  expect(updatedUser?.emailVerified).toBe(true);
  expect(updatedUser?.verificationCode).toBe(undefined);
  expect(updatedUser?.status).toBe("Active");
}

export const validProjectBody = {
  location: "2-4 Mintaro Ave, Strathfield 2135 (Lot 1, DP: 954705)",
  council: "Strathfield",
  status: "90% Complete",
  creatorHasInsurance: true,
  creatorHasLicence: true,
};

export async function getProjectId(token: string, creatorRole: UserRole): Promise<string> {
  const body = { ...validProjectBody, creatorRole };

  const projectRes = await request(app)
    .post("/project")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

  expect(projectRes.status).toBe(200);
  expect(projectRes.body.projectId).toBeDefined();
  return projectRes.body.projectId as string;
}
