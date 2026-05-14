import request from "supertest";
import { app } from "../../app";
import { AuthError, verifyOtp } from "../../service/auth.service";

jest.mock("../../service/auth.service", () => {
  const actual = jest.requireActual<typeof import("../../service/auth.service")>(
    "../../service/auth.service"
  );
  return { ...actual, verifyOtp: jest.fn() };
});

const mockedVerifyOtp = verifyOtp as jest.MockedFunction<typeof verifyOtp>;

const endpoint = "/auth/verify-otp";

beforeEach(() => jest.clearAllMocks());

const mockResult = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: { id: "user-1", name: "Tom Cheng", email: "", role: "Subbie", status: "Active" } as any,
};

describe("POST /auth/verify-otp", () => {
  it("returns 200 with tokens on valid code", async () => {
    mockedVerifyOtp.mockResolvedValueOnce(mockResult);
    const res = await request(app)
      .post(endpoint)
      .send({ mobile: "0412345678", code: "123456", flow: "signin" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken", "access-token");
    expect(res.body).toHaveProperty("refreshToken", "refresh-token");
    expect(mockedVerifyOtp).toHaveBeenCalledWith("0412345678", "123456", "signin");
  });

  it("returns 400 on incorrect code", async () => {
    mockedVerifyOtp.mockRejectedValueOnce(new AuthError("Incorrect code. Please try again.", 400));
    const res = await request(app)
      .post(endpoint)
      .send({ mobile: "0412345678", code: "000000", flow: "signin" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Incorrect code. Please try again.");
  });

  it("returns 400 on expired code", async () => {
    mockedVerifyOtp.mockRejectedValueOnce(new AuthError("Invalid or expired code", 400));
    const res = await request(app)
      .post(endpoint)
      .send({ mobile: "0412345678", code: "123456", flow: "signin" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid or expired code");
  });

  it("returns 400 when mobile is missing", async () => {
    const res = await request(app).post(endpoint).send({ code: "123456", flow: "signin" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when code is missing", async () => {
    const res = await request(app).post(endpoint).send({ mobile: "0412345678", flow: "signin" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid flow value", async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ mobile: "0412345678", code: "123456", flow: "magic" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
