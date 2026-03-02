import rateLimit from "express-rate-limit";

// Limits registration attempts to 5 per IP every 15 minutes to prevent abuse.
// Skipped in test environments.
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many registration attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

export { registrationLimiter };
