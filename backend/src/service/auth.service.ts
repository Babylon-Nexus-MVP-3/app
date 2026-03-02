// Business Logic for Endpoints Involving Authentication
import { UserModel } from "../models/userModel";
import {
  checkName,
  checkEmail,
  checkPassword,
  generateCode,
  hashPassword,
} from "../utils/authHelper";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/*
  [1] - Register User
  Creates a new user account after validating and sanitizing inputs.
  Returns the new user's ID on success.
*/

interface RegisterInput {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
}

export async function registerUser(input: RegisterInput): Promise<string> {
  // Trim whitespace and normalise email to lowercase for consistency
  const sanitizedFirstName = input.firstName.trim();
  const sanitizedLastName = input.lastName.trim();
  const normalisedEmail = input.email.toLowerCase().trim();
  const name = `${sanitizedFirstName} ${sanitizedLastName}`;

  // Validate name, email uniqueness, and password strength before proceeding
  try {
    checkName(name);
    await checkEmail(normalisedEmail);
    checkPassword(input.password);
  } catch (error) {
    throw new AuthError("Registration failed. Please check your information and try again.");
  }
  const { code, expiry } = generateCode();
  const hashedPassword = await hashPassword(input.password);
  // Build new user document with default security state (locked: false, no tokens, unverified)
  const newUser = new UserModel({
    name: name,
    email: normalisedEmail,
    password: hashedPassword,
    loginAttempts: 0,
    accountLocked: false,
    verificationCode: code, // TODO: Hash verification code before storing in production
    verificationCodeExpiry: expiry,
    emailVerified: false,
  });

  await newUser.save();
  return newUser._id.toString();
}
