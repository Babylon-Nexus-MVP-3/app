import nodemailer from "nodemailer";

const BASE_URL = "https://api.babylon-nexus.com";
const LOGO_URL = `${BASE_URL}/assets/appIcon.png`;
const NSW_LOGO_URL = `${BASE_URL}/assets/nsw-government-logo.png`;
const APP_STORE_BADGE_URL = `${BASE_URL}/assets/app-store-badge.png`;
const GOOGLE_PLAY_BADGE_URL = `${BASE_URL}/assets/google-play-badge.png`;

const emailSignature = `
  <div style="margin-top: 32px;">
    <table style="margin: 0 auto 32px; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px;">
          <a href="https://apps.apple.com/au/app/vouchpay/id6746705191">
            <img src="${APP_STORE_BADGE_URL}" alt="Download on the App Store" height="44" style="display: block;" />
          </a>
        </td>
        <td style="padding: 4px;">
          <a href="https://play.google.com/store/apps/details?id=com.babylonnexus.vouchpay">
            <img src="${GOOGLE_PLAY_BADGE_URL}" alt="Get it on Google Play" height="44" style="display: block;" />
          </a>
        </td>
      </tr>
    </table>

  </div>

  <div style="padding-top: 28px; border-top: 2px solid #134A2F; text-align: center;">
    <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: #134A2F; letter-spacing: -0.3px;">Stop losing money on bad jobs.</p>
    <p style="margin: 0 0 24px; font-size: 20px; font-weight: 800; color: #134A2F; letter-spacing: -0.3px;">Work with people you trust.</p>

    <table style="margin: 0 auto; border-collapse: collapse; background: #f4f4f4; border-radius: 12px; width: 100%; max-width: 340px;">
      <tr>
        <td style="width: 72px; padding: 14px 6px 14px 14px; vertical-align: middle;">
          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 6px; display: inline-block;">
            <img src="${NSW_LOGO_URL}" alt="NSW Government" width="52" height="52" style="display: block;" />
          </div>
        </td>
        <td style="padding: 14px 14px 14px 8px; vertical-align: middle; text-align: left;">
          <div style="font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px;">Backed by NSW Government</div>
          <div style="font-size: 13px; color: #666;">MVP Innovation Grant</div>
        </td>
      </tr>
    </table>
  </div>
`;

const emailHeader = `
  <div style="background-color: #134A2F; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="VouchPay" width="80" height="80" style="display: block; margin: 0 auto; border-radius: 12px;" />
  </div>
`;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
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
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "You've been invited to a project on VouchPay",
    text: `You have been invited to join the project at ${projectLocation}.\n\nYour invite code is: ${inviteCode}\n\nTo join:\n1. Download the VouchPay app\n2. Register for an account if you haven't already\n3. Log in and tap "Join Project"\n4. Enter the code above`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
          <h2>You've been invited to a project</h2>
          <p>You have been invited to join the project at <strong>${projectLocation}</strong>.</p>
          <p>Your invite code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
            ${inviteCode}
          </div>
          <div style="margin-top: 24px;">
            <p style="font-weight: bold; margin-bottom: 8px;">To join the project:</p>
            <ol style="padding-left: 20px; line-height: 1.8;">
              <li>Download the <strong>VouchPay</strong> app</li>
              <li>Register for an account if you haven't already</li>
              <li>Log in and tap <strong>"Join Project"</strong></li>
              <li>Enter the code above</li>
            </ol>
          </div>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendOnboardingEmail(to: string, verificationCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to VouchPay",
    text: `Welcome to VouchPay!\n\nYour verification code is: ${verificationCode}\n\nTo get started:\n1. Open the VouchPay app\n2. Enter the code above to verify your account`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
          <h2>Welcome to VouchPay</h2>
          <p>Thanks for signing up! Use the code below to verify your account.</p>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
            ${verificationCode}
          </div>
          <div style="margin-top: 24px;">
            <p style="font-weight: bold; margin-bottom: 8px;">To verify your account:</p>
            <ol style="padding-left: 20px; line-height: 1.8;">
              <li>Open the <strong>VouchPay</strong> app</li>
              <li>Enter the code above when prompted</li>
            </ol>
          </div>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendResendVerificationEmail(
  to: string,
  verificationCode: string
): Promise<void> {
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your new verification code",
    text: `You requested a new verification code.\n\nYour verification code is: ${verificationCode}\n\nTo get started:\n1. Open the VouchPay app\n2. Enter the code above to verify your account\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
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
              <li>Open the <strong>VouchPay</strong> app</li>
              <li>Enter the code above when prompted</li>
            </ol>
          </div>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a new code, you can safely ignore this email.</p>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendVouchRequestEmail(
  to: string,
  fromName: string,
  fromCompany: string,
  relationship: string,
  projectName: string
): Promise<void> {
  const context = [relationship, projectName].filter(Boolean).join(" on ");
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${fromName} has asked you to vouch for them on VouchPay`,
    text: `Hi,\n\n${fromName} from ${fromCompany} (${context}) has asked you to vouch for them on VouchPay.\n\nTo respond:\n1. Download the VouchPay app\n2. Sign in or create a free account\n3. Tap "Give a Vouch" — their request will be waiting for you\n\nVouchPay helps tradespeople and businesses build credibility through peer vouches.\n\nIf you weren't expecting this, you can safely ignore it.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
          <h2>${fromName} wants you to vouch for them</h2>
          <p><strong>${fromName}</strong> from <strong>${fromCompany}</strong> has asked you to vouch for them on VouchPay.</p>
          <div style="background: #f8f9fa; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #5a5a5a; font-size: 14px;">${context}</p>
          </div>
          <p>To respond, open the VouchPay app, tap <strong>"Give a Vouch"</strong> and their request will be waiting for you.</p>
          <p>If you don't have the app yet:</p>
          <ol style="line-height: 1.8;">
            <li>Download <strong>VouchPay</strong></li>
            <li>Create a free account</li>
            <li>Tap <strong>"Give a Vouch"</strong> — the request will appear automatically</li>
          </ol>
          <p style="margin-top: 24px; color: #9b9b9b; font-size: 12px;">If you weren't expecting this, you can safely ignore it.</p>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendVouchedForEmail(
  to: string,
  recipientName: string,
  giverName: string,
  giverCompany: string,
  attributes: string[] = [],
  note?: string
): Promise<void> {
  const attributeList = attributes.length
    ? `<ul style="padding-left: 20px; line-height: 1.8; margin: 8px 0;">
        ${attributes.map((a) => `<li>${a}</li>`).join("")}
      </ul>`
    : "";

  const noteBlock = note
    ? `<p style="margin: 12px 0 0; font-style: italic; color: #444;">"${note}"</p>`
    : "";

  const attributeSection = attributes.length
    ? `<div style="background: #E8F5EE; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #1B5C38; font-weight: bold; font-size: 15px;">Here's what ${giverName} said about you:</p>
        ${attributeList}
        ${noteBlock}
      </div>`
    : `<div style="background: #E8F5EE; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #1B5C38; font-weight: bold; font-size: 15px;">${giverName} had great things to say about you and your work.</p>
      </div>`;

  const textAttributes = attributes.length
    ? `\n\nThey vouched for you on: ${attributes.join(", ")}`
    : "";
  const textNote = note ? `\n\nThey said: "${note}"` : "";

  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${giverName} just vouched for you on VouchPay 🎉`,
    text: `Hi ${recipientName},\n\nGreat news — ${giverName} from ${giverCompany} just vouched for you on VouchPay. They had some great things to say about you!${textAttributes}${textNote}\n\nJoin VouchPay to claim your reputation and see your full vouch:\n1. Download the VouchPay app\n2. Create a free account using your ABN\n3. Your vouch will be waiting for you\n\nVouchPay helps tradespeople and businesses build credibility through peer vouches.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
          <h2 style="margin-top: 0;">Great news, ${recipientName}! 🎉</h2>
          <p><strong>${giverName}</strong> from <strong>${giverCompany}</strong> just vouched for you on VouchPay — they had some great things to say about you!</p>
          ${attributeSection}
          <p>Claim your reputation on VouchPay to see your full vouch and share it with future clients.</p>
          <ol style="line-height: 1.8;">
            <li>Download the <strong>VouchPay</strong> app</li>
            <li>Create a free account using your ABN</li>
            <li>Your vouch will be waiting for you</li>
          </ol>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendForgotPasswordEmail(to: string, resetCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your password reset code",
    text: `You requested a password reset.\n\nYour reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nTo reset your password:\n1. Open the VouchPay app\n2. Enter the code above when prompted\n3. Choose a new password\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
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
              <li>Open the <strong>VouchPay</strong> app</li>
              <li>Enter the code above when prompted</li>
              <li>Choose a new password</li>
            </ol>
          </div>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}

export async function sendResendResetCodeEmail(to: string, resetCode: string): Promise<void> {
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your new password reset code",
    text: `You requested a new password reset code.\n\nYour reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nTo reset your password:\n1. Open the VouchPay app\n2. Enter the code above when prompted\n3. Choose a new password\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
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
              <li>Open the <strong>VouchPay</strong> app</li>
              <li>Enter the code above when prompted</li>
              <li>Choose a new password</li>
            </ol>
          </div>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">If you didn't request a new reset code, you can safely ignore this email. Your password will not be changed.</p>
        </div>
      </div>
    `,
  });
}

export async function sendEmailChangeCode(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"VouchPay" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Confirm your new email address",
    text: `You requested to change your email address.\n\nYour confirmation code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
        ${emailHeader}
        <div style="padding: 24px;">
          <h2>Confirm your new email</h2>
          <p>We received a request to change your VouchPay email address to <strong>${to}</strong>.</p>
          <p>Enter the code below in the app to confirm:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
            ${code}
          </div>
          <p style="margin-top: 16px; color: #888; font-size: 13px;">This code expires in 15 minutes.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this change, you can safely ignore this email.</p>
          ${emailSignature}
        </div>
      </div>
    `,
  });
}
