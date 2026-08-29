import { requestDelete, requestAuthRegister } from "../requestHelpers";
import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 10000);

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
}, 10000);

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

  /*
    Some people go by a single name. Requiring a surname is what made the old
    sign-up screen send a literal "-", so an empty last name must register and
    store as "" rather than being rejected or padded.
  */
  test("Register user with no last name", async () => {
    const result = await requestAuthRegister("Cher", "", "SecurePassword123*", "cher@example.com");

    expect(result.body.userId).toStrictEqual(expect.any(String));
    expect(result.statusCode).toStrictEqual(201);

    const user = await UserModel.findById(result.body.userId).lean();
    expect(user?.firstName).toBe("Cher");
    expect(user?.lastName).toBe("");
  });

  test("Stores the two halves separately rather than one joined string", async () => {
    const result = await requestAuthRegister(
      "Mary",
      "Van Der Berg",
      "SecurePassword123*",
      "mary@example.com"
    );

    expect(result.statusCode).toStrictEqual(201);
    const user = await UserModel.findById(result.body.userId);
    expect(user?.firstName).toBe("Mary");
    expect(user?.lastName).toBe("Van Der Berg");
    // Display name is derived, never stored.
    expect(user?.name).toBe("Mary Van Der Berg");
    expect(user?.toObject()).not.toHaveProperty("$__.name");
  });
});
