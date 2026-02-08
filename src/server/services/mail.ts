import { Resend } from 'resend';
import { config } from '@/lib/config';

const resend = new Resend(config.email.resendApiKey);

interface PasswordResetEmailProps {
  to: string;
  name: string;
  url: string;
}

interface InvitationEmailProps {
  to: string;
  name: string;
  role: string;
  token: string;
  position?: string;
}

export async function sendInvitationEmail({ to, name, role, token, position }: InvitationEmailProps) {
  const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || config.betterAuth.url;
  const inviteLink = `${baseUrl}/invite/${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Cortex <onboarding@opsguard.dev>', // Update this with a verified domain in production
      to,
      subject: `Invitation to join Cortex as ${role}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #09090b; color: #ffffff; border: 1px solid #27272a; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: rgba(79, 70, 229, 0.1); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: 9999px; color: #818cf8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">
              System Authorization
            </div>
          </div>
          
          <h1 style="font-size: 24px; font-weight: 900; text-align: center; letter-spacing: -0.025em; margin-bottom: 8px; color: #ffffff;">
            CORTEX COMMAND
          </h1>
          
          <p style="color: #a1a1aa; text-align: center; margin-bottom: 32px; font-size: 16px; font-weight: 300;">
            You have been authorized to join the visual data command interface.
          </p>
          
          <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <div style="margin-bottom: 16px;">
              <span style="color: #71717a; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">Subject</span>
              <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${name}</span>
            </div>
            
            <div style="display: flex; gap: 24px;">
              <div style="flex: 1;">
                <span style="color: #71717a; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">Authorized Role</span>
                <span style="color: #818cf8; font-size: 14px; font-weight: bold;">${role}</span>
              </div>
              ${position ? `
              <div style="flex: 1;">
                <span style="color: #71717a; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">Tactical Position</span>
                <span style="color: #ffffff; font-size: 14px;">${position}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${inviteLink}" style="display: inline-block; padding: 12px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
              Initialize Secure Session
            </a>
          </div>
          
          <p style="color: #52525b; font-size: 11px; text-align: center; margin-top: 32px; line-height: 1.5;">
            This invitation link is specifically for <strong>${to}</strong>.<br/>
            If you did not expect this invitation, please disregard this transmission.
          </p>
          
          <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center;">
            <span style="color: #3f3f46; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em;">
              Cortex Interface System • Identity & Access Control
            </span>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Email failed:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email unexpected error:', err);
    return { success: false, error: err };
  }
}



export async function sendPasswordResetEmail({ to, name, url }: PasswordResetEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Cortex <security@opsguard.dev>',
      to,
      subject: 'Reset your Cortex Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #09090b; color: #ffffff; border: 1px solid #27272a; border-radius: 12px;">
          <h2 style="color: #ffffff; margin-bottom: 24px;">Reset Password</h2>
          <p style="color: #a1a1aa; margin-bottom: 24px;">
            Hello ${name},<br/><br/>
            We received a request to reset the password for your Cortex account. If you initiated this request, please click the button below to secure your account.
          </p>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #52525b; font-size: 11px; text-align: center;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Reset Email failed:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err };
  }
}

