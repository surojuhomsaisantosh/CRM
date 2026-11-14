import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendUserCredentials(
  email: string,
  name: string,
  role: string,
  inviteLink: string
) {
  if (!resend) {
    console.log(`[Resend Mock] Send credentials to ${email} (Name: ${name}, Role: ${role}). Invite Link: ${inviteLink}`);
    return { success: true };
  }

  try {
    const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'CRM';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'support@crm.internal',
      to: email,
      subject: `Welcome to ${companyName} — Set Your Password`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to ${companyName} CRM</h2>
          <p>Hello ${name || 'there'},</p>
          <p>An account has been created for you with the role of <strong>${role}</strong>.</p>
          <p>Please click the button below to set up your password and access the CRM:</p>
          <div style="margin: 24px 0;">
            <a href="${inviteLink}" style="background-color: #0f1d33; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
          </div>
          <p style="color: #666; font-size: 13px;">If you did not request this invitation, please ignore this email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to send credentials via Resend:', err.message);
    return { error: err.message };
  }
}

export async function sendPasswordResetLink(email: string, resetLink: string) {
  if (!resend) {
    console.log(`[Resend Mock] Password reset link for ${email}: ${resetLink}`);
    return { success: true };
  }

  try {
    const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'CRM';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'support@crm.internal',
      to: email,
      subject: `Reset Your Password — ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password for ${companyName} CRM.</p>
          <div style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #0f1d33; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px;">If you did not request this reset, your account is still secure and you can ignore this email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err: any) {
    console.error('Failed to send reset link via Resend:', err.message);
    return { error: err.message };
  }
}
