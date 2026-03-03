import request from "supertest";
import { app } from "../../app";
import { AuthError, loginUser } from "../../service/auth.service";

jest.mock("../../service/auth.service", () => {
  // Use the real AuthError class but mock loginUser
  const actual = jest.requireActual<typeof import("../../service/auth.service")>(
    "../../service/auth.service"
  );

  return {
    ...actual,
    loginUser: jest.fn(),
  };
});

const mockedLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;

describe("POST /auth/login", () => {
  const endpoint = "/auth/login";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and tokens for valid credentials", async () => {
    mockedLoginUser.mockResolvedValueOnce({
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      // Minimal user shape needed by the controller
      user: {
        id: "user_123",
        name: "John Doe",
        email: "john.doe@example.com",
        phoneNumber: "+61412345678",
        role: "PM",
        verticalGroup: "Residential",
        horizontalAttribute: "Senior",
        licenceNumber: "123456",
        status: "Active",
      } as any,
    });

    const payload = {
      email: "john.doe@example.com",
      password: "SecurePass123!",
    };

    const response = await request(app).post(endpoint).send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken", "test-access-token");
    expect(response.body).toHaveProperty("refreshToken", "test-refresh-token");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user.email).toBe("john.doe@example.com");

    expect(mockedLoginUser).toHaveBeenCalledWith(payload);
  });

  it("returns 400 and error message for invalid credentials", async () => {
    mockedLoginUser.mockRejectedValueOnce(new AuthError("Invalid credentials", 400));

    const response = await request(app).post(endpoint).send({
      email: "john.doe@example.com",
      password: "WrongPassword",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid credentials" });
  });
});
