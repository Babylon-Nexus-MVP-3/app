// Business Logic for Endpoints Involving Authentication
import { UserModel } from "../models/userModel";
import {
  checkName,
  checkEmail,
  checkPassword,
  generateCode,
  hashPassword,
} from "../utils/authHelper";

/*
  [1] - Register User
  Creates a new user account after validating and sanitizing inputs.
  Returns the new user's ID on success.
*/
export async function registerUser(
  firstName: string,
  lastName: string,
  password: string,
  email: string
): Promise<string> {
  // Trim whitespace and normalise email to lowercase for consistency
  const sanitizedFirstName = firstName.trim();
  const sanitizedLastName = lastName.trim();
  const normalisedEmail = email.toLowerCase().trim();
  const name = `${sanitizedFirstName} ${sanitizedLastName}`;

  // Validate name, email uniqueness, and password strength before proceeding
  try {
    checkName(name);
    await checkEmail(normalisedEmail);
    checkPassword(password);
  } catch (error) {
    throw new Error("Registration failed. Please check your information and try again.", {
      cause: error,
    });
  }
  const { code, expiry } = generateCode();
  const hashedPassword = await hashPassword(password);
  // Build new user document with default security state (locked: false, no tokens, unverified)
  const newUser = new UserModel({
    name: name,
    email: normalisedEmail,
    password: hashedPassword,
    refreshTokens: [],
    loginAttempts: 0,
    accountLocked: false,
    verificationCode: code, // TODO: Hash verification code before storing in production
    verificationCodeExpiry: expiry,
    emailVerified: false,
  });

  await newUser.save();
  return newUser._id.toString();
}
