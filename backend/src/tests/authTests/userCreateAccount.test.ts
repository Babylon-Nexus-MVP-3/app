import { requestDelete, requestAuthRegister } from "../requestHelpers";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeAll(async () => {
  // Ensure DB is connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

describe("Error Cases", () => {
  describe("Test Email", () => {
    test("email address is already used by another user", async () => {
      await requestAuthRegister("firstname", "lastname", "abcdefghIJ123456*", "email@unsw.edu.au");
      const res = await requestAuthRegister(
        "firstname1",
        "lastname1",
        "abcdefghIJK123456*",
        "email@unsw.edu.au"
      );
      const data = res.body;

      expect(data).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    // email address does not satisfy isEmail
    test.each([
      "invalidunsw.edu.au",
      "invalidemailslkcom",
      "invalid@emailcom",
      "yrigushfsgpishfd",
      "34678893487",
      "#$%^&*()&*()",
    ])("invalid email address", async (email) => {
      const res = await requestAuthRegister("firstName", "lastname", "abcdefghIJ123456*", email);
      const data = res.body;

      expect(data).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });
  });

  describe("Test Name", () => {
    test.each([
      "~",
      "`",
      "!",
      "@",
      "#",
      "$",
      "%",
      "^",
      "&",
      "*",
      "(",
      ")",
      "_",
      "+",
      "=",
      "{",
      "[",
      "}",
      "]",
      "|",
      "\\",
      ":",
      ";",
      '"',
      "<",
      ",",
      ">",
      ".",
      "?",
      "/",
      "1",
    ])("first name containing invalid charcters", async (char) => {
      const res = await requestAuthRegister(
        "firstname " + char,
        "lastname",
        "abcdefghIJ123456*",
        "email@unsw.edu.au"
      );
      const data = res.body;

      expect(data).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    // lastname contains characters other than lowercase
    // letters, uppercase letters, spaces, hyphens, or apostrophes.
    test.each([
      "~",
      "`",
      "!",
      "@",
      "#",
      "$",
      "%",
      "^",
      "&",
      "*",
      "(",
      ")",
      "_",
      "+",
      "=",
      "{",
      "[",
      "}",
      "]",
      "|",
      "\\",
      ":",
      ";",
      '"',
      "<",
      ",",
      ">",
      ".",
      "?",
      "/",
      "1",
    ])("last name containing invalid charcters", async (char) => {
      const res = await requestAuthRegister(
        "firstname ",
        "lastname " + char,
        "abcdefghIJ123456*",
        "email@unsw.edu.au"
      );
      const data = res.body;

      expect(data).toStrictEqual({ error: expect.any(String) });
      expect(res.statusCode).toStrictEqual(400);
    });

    describe("Testing password", () => {
      // Password is less than 12 characters.
      test("Invalid password length", async () => {
        const res = await requestAuthRegister(
          "firstname ",
          "lastname",
          "3456*",
          "email@unsw.edu.au"
        );
        const data = res.body;

        expect(data).toStrictEqual({ error: expect.any(String) });
        expect(res.statusCode).toStrictEqual(400);
      });

      // Password does not contain at least one number and at least one letter.
      test.each(["abcdefgh", "12345678", "shfvfhj^&&*%", "253768%&^*"])(
        "Password does not contain at least one number and one letter",
        async (password) => {
          const res = await requestAuthRegister(
            "firstname ",
            "lastname",
            password,
            "email@unsw.edu.au"
          );
          const data = res.body;

          expect(data).toStrictEqual({ error: expect.any(String) });
          expect(res.statusCode).toStrictEqual(400);
        }
      );
    });
  });
});

describe("Success Cases", () => {
  test("Register User", async () => {
    const result = await requestAuthRegister(
      "Mubashir",
      "Hussain",
      "SecurePassword123*",
      "Mubashirmh04@gmail.com"
    );
    const data = result.body;

    expect(data.userId).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(201);
  });
});
