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
