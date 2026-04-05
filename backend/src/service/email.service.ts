import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendInviteEmail(
  to: string,
  inviteCode: string,
  projectLocation: string
): Promise<void> {
  await transporter.sendMail({
    from: `"Babylon Nexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "You've been invited to a project on Babylon Nexus",
    text: `You have been invited to join the project at ${projectLocation}.\n\nYour invite code is: ${inviteCode}\n\nTo join:\n1. Download the Babylon Nexus app\n2. Register for an account if you haven't already\n3. Log in and tap "Join Project"\n4. Enter the code above`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You've been invited to a project</h2>
        <p>You have been invited to join the project at <strong>${projectLocation}</strong>.</p>
        <p>Your invite code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${inviteCode}
        </div>
        <div style="margin-top: 24px;">
          <p style="font-weight: bold; margin-bottom: 8px;">To join the project:</p>
          <ol style="padding-left: 20px; line-height: 1.8;">
            <li>Download the <strong>Babylon Nexus</strong> app</li>
            <li>Register for an account if you haven't already</li>
            <li>Log in and tap <strong>"Join Project"</strong></li>
            <li>Enter the code above</li>
          </ol>
        </div>
      </div>
    `,
  });
}

export async function sendOnboardingEmail(to: string, verificationCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"Babylon Nexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to Babylon Nexus",
    text: `Welcome to Babylon Nexus!\n\nYour verification code is: ${verificationCode}\n\nTo get started:\n1. Open the Babylon Nexus app\n2. Enter the code above to verify your account`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to Babylon Nexus</h2>
        <p>Thanks for signing up! Use the code below to verify your account.</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${verificationCode}
        </div>
        <div style="margin-top: 24px;">
          <p style="font-weight: bold; margin-bottom: 8px;">To verify your account:</p>
          <ol style="padding-left: 20px; line-height: 1.8;">
            <li>Open the <strong>Babylon Nexus</strong> app</li>
            <li>Enter the code above when prompted</li>
          </ol>
        </div>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendResendVerificationEmail(
  to: string,
  verificationCode: string
): Promise<void> {
  await transporter.sendMail({
    from: `"Babylon Nexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your new verification code",
    text: `You requested a new verification code.\n\nYour verification code is: ${verificationCode}\n\nTo get started:\n1. Open the Babylon Nexus app\n2. Enter the code above to verify your account\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Verification Code</h2>
        <p>You requested a new verification code. Use the code below to verify your account.</p>
        <p>Your code expires in 15 minutes</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${verificationCode}
        </div>
        <div style="margin-top: 24px;">
          <p style="font-weight: bold; margin-bottom: 8px;">To verify your account:</p>
          <ol style="padding-left: 20px; line-height: 1.8;">
            <li>Open the <strong>Babylon Nexus</strong> app</li>
            <li>Enter the code above when prompted</li>
          </ol>
        </div>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a new code, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendForgotPasswordEmail(to: string, resetCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"Babylon Nexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your password reset code",
    text: `You requested a password reset.\n\nYour reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nTo reset your password:\n1. Open the Babylon Nexus app\n2. Enter the code above when prompted\n3. Choose a new password\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Use the code below to reset your password.</p>
        <p style="color: #888; font-size: 14px;">This code expires in 15 minutes.</p>
        <p>Your reset code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${resetCode}
        </div>
        <div style="margin-top: 24px;">
          <p style="font-weight: bold; margin-bottom: 8px;">To reset your password:</p>
          <ol style="padding-left: 20px; line-height: 1.8;">
            <li>Open the <strong>Babylon Nexus</strong> app</li>
            <li>Enter the code above when prompted</li>
            <li>Choose a new password</li>
          </ol>
        </div>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      </div>
    `,
  });
}

export async function sendResendResetCodeEmail(to: string, resetCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"Babylon Nexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your new password reset code",
    text: `You requested a new password reset code.\n\nYour reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nTo reset your password:\n1. Open the Babylon Nexus app\n2. Enter the code above when prompted\n3. Choose a new password\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Password Reset Code</h2>
        <p>You requested a new password reset code. Use the code below to reset your password.</p>
        <p style="color: #888; font-size: 14px;">This code expires in 15 minutes.</p>
        <p>Your new reset code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${resetCode}
        </div>
        <div style="margin-top: 24px;">
          <p style="font-weight: bold; margin-bottom: 8px;">To reset your password:</p>
          <ol style="padding-left: 20px; line-height: 1.8;">
            <li>Open the <strong>Babylon Nexus</strong> app</li>
            <li>Enter the code above when prompted</li>
            <li>Choose a new password</li>
          </ol>
        </div>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a new reset code, you can safely ignore this email. Your password will not be changed.</p>
      </div>
    `,
  });
}
