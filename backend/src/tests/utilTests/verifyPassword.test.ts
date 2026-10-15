import bcrypt from "bcrypt";
import { verifyPassword } from "../../utils/authHelper";

describe("verifyPassword", () => {
  const password = "Abcdefgh123456$";

  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await bcrypt.hash(password, 4);

    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword1!", hash)).toBe(false);
  });

  it("verifies $2a$ hashes, which older seed data was written with", async () => {
    // A $2a$ hash (cost 4) of the password above — the format bcryptjs wrote.
    const legacyHash = "$2a$04$3U/90c78nIVweLi8bk9CHehASGbOwzQ/5Lwc3/8Ym6T.K3r8O6nX6";

    expect(await verifyPassword(password, legacyHash)).toBe(true);
  });

  it("returns false instead of throwing for an account with no password", async () => {
    expect(await verifyPassword(password, undefined)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, "")).toBe(false);
  });
});
