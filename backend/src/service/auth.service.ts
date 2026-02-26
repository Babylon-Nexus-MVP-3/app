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
    Allow user to register/create a new account with the platform
*/
export async function registerUser(
  firstName: string,
  lastName: string,
  password: string,
  email: string
): Promise<string> {
  // Sanitize inputs for security
  const sanitizedFirstName = firstName.trim();
  const sanitizedLastName = lastName.trim();
  const normalisedEmail = email.toLowerCase().trim();
  const name = `${sanitizedFirstName} ${sanitizedLastName}`;

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
  const newUser = new UserModel({
    name: name,
    email: normalisedEmail,
    password: hashedPassword,
    refreshTokens: [],
    loginAttempts: 0,
    accountLocked: false,
    verificationCode: code, // Note: Hash later, for now leave as is for testing
    verificationCodeExpiry: expiry,
    emailVerified: false,
  });

  await newUser.save();
  return newUser._id.toString();
}
