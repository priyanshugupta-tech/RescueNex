import { Resend } from 'resend';
import { config } from '../config/index.js';

export class EmailService {
  private resend?: Resend;
  private senderEmail: string;

  constructor() {
    if (config.resendApiKey) {
      this.resend = new Resend(config.resendApiKey);
    }
    this.senderEmail = config.resendFromEmail || 'Security Team <noreply@deardeveloperr.in>';
  }

  /**
   * Dispatches OTP email matching the exact template from sendIt
   */
  public async sendOTP(email: string, otp: string): Promise<{ success: boolean; error?: any }> {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 40px 20px;">
            <tr>
            <td align="center">
                <!-- Main Email Container -->
                <table width="100%" id="email-card" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); padding: 32px; text-align: left;">
                
                <!-- Application Logo / Name -->
                <tr>
                    <td style="padding-bottom: 24px; border-bottom: 1px solid #f3f4f6;">
                    <span style="font-size: 20px; font-weight: 700; color: #dc2626; letter-spacing: -0.5px;">RescueNex</span>
                    </td>
                </tr>

                <!-- Heading -->
                <tr>
                    <td style="padding-top: 24px;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0; letter-spacing: -0.5px;">Verify your identity</h1>
                    <p style="font-size: 15px; line-height: 24px; color: #4b5563; margin: 0 0 24px 0;">
                        Please use the following One-Time Password (OTP) to complete your registration process. This code is strictly valid for <strong>5 minutes</strong>.
                    </p>
                    </td>
                </tr>

                <!-- OTP Display Block -->
                <tr>
                    <td align="center" style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 6px; padding-left: 6px;">${otp}</span>
                    </td>
                </tr>

                <!-- Safety / Security Warning -->
                <tr>
                    <td style="padding-top: 24px;">
                    <p style="font-size: 13px; line-height: 20px; color: #6b7280; margin: 0 0 24px 0;">
                        <strong>Security reminder:</strong> Never share this code with anyone. Our emergency team or automated systems will never ask you for your OTP. If you did not make this request, please ignore this email.
                    </p>
                    </td>
                </tr>

                <!-- Footer Information -->
                <tr>
                    <td style="padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center; line-height: 18px;">
                    <p style="margin: 0 0 4px 0;">&copy; 2026 RescueNex National Early Warning Platform. All rights reserved.</p>
                    <p style="margin: 0;">Automated message. Please do not reply directly to this mail.</p>
                    </td>
                </tr>

                </table>
            </td>
            </tr>
        </table>
    </body>
</html>`;

    if (!this.resend) {
      console.log(`\n======================================================`);
      console.log(`📧 [Resend Dev Mode] OTP for: ${email}`);
      console.log(`🔑 OTP CODE: ${otp} (Valid for 5 minutes)`);
      console.log(`======================================================\n`);
      return { success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.senderEmail,
        to: [email],
        subject: 'OTP to verify your identity at RescueNex',
        html: htmlTemplate
      });

      if (response.error) {
        console.error('⚠️ [Resend Error]:', response.error);
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch (err: any) {
      console.error('⚠️ [Resend Exception]:', err.message);
      return { success: false, error: err };
    }
  }
}

export const emailService = new EmailService();
