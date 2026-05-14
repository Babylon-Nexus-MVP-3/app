import request from "supertest";
import { app } from "../../app";
import { AuthError, requestOtp } from "../../service/auth.service";

jest.mock("../../service/auth.service", () => {
  const actual = jest.requireActual<typeof import("../../service/auth.service")>(
    "../../service/auth.service"
  );
  return { ...actual, requestOtp: jest.fn() };
});

const mockedRequestOtp = requestOtp as jest.MockedFunction<typeof requestOtp>;

const endpoint = "/auth/request-otp";

beforeEach(() => jest.clearAllMocks());

describe("POST /auth/request-otp", () => {
  it("returns 200 for valid signin request", async () => {
    mockedRequestOtp.mockResolvedValueOnce({});
    const res = await request(app).post(endpoint).send({ mobile: "0412345678", flow: "signin" });
    expect(res.status).toBe(200);
    expect(mockedRequestOtp).toHaveBeenCalledWith({
      mobile: "0412345678",
      flow: "signin",
      abn: undefined,
      businessName: undefined,
      email: undefined,
      name: undefined,
    });
  });

  it("returns 200 for valid signup request", async () => {
    mockedRequestOtp.mockResolvedValueOnce({});
    const res = await request(app).post(endpoint).send({
      mobile: "0412345678",
      flow: "signup",
      abn: "53004085616",
      businessName: "Acme Pty Ltd",
      name: "Tom Cheng",
      email: "tom@example.com",
    });
    expect(res.status).toBe(200);
  });

  it("returns 400 when mobile is missing", async () => {
    const res = await request(app).post(endpoint).send({ flow: "signin" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid flow value", async () => {
    const res = await request(app).post(endpoint).send({ mobile: "0412345678", flow: "magic" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 404 when signin mobile has no account", async () => {
    mockedRequestOtp.mockRejectedValueOnce(new AuthError("No account found for this number", 404));
    const res = await request(app).post(endpoint).send({ mobile: "0499999999", flow: "signin" });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "No account found for this number");
  });

  it("returns 409 when signup mobile already has active account", async () => {
    mockedRequestOtp.mockRejectedValueOnce(
      new AuthError("An account with this mobile already exists. Please sign in.", 409)
    );
    const res = await request(app).post(endpoint).send({
      mobile: "0412345678",
      flow: "signup",
      abn: "53004085616",
      name: "Tom Cheng",
    });
    expect(res.status).toBe(409);
  });
});
