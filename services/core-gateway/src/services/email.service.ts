import { Resend } from 'resend';

export class EmailService {
  private resend?: Resend;
  private senderEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
    this.senderEmail = process.env.RESEND_FROM_EMAIL || 'RescueNex Alerts <onboarding@resend.dev>';
  }

  /**
   * Dispatches 6-digit verification OTP to the user's email via Resend
   */
  public async sendOTP(email: string, otp: string): Promise<boolean> {
    const subject = `${otp} is your RescueNex Verification Code`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">RescueNex Early Warning Platform</h2>
        <p style="color: #475569; font-size: 15px;">Use the verification code below to sign in or create your commuter account:</p>
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not request this verification, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">RescueNex Disaster Intelligence • Climate-Resilient J&K</p>
      </div>
    `;

    if (!this.resend) {
      // Development console logger when RESEND_API_KEY is not yet filled in .env
      console.log(`\n======================================================`);
      console.log(`📧 [Resend Dev Mode] Verification OTP for ${email}`);
      console.log(`🔑 OTP CODE: ${otp} (Valid for 10 minutes)`);
      console.log(`======================================================\n`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: this.senderEmail,
        to: email,
        subject,
        html: htmlContent
      });
      return true;
    } catch (error: any) {
      console.error(`⚠️ [Resend] Failed to send email to ${email}:`, error.message);
      // Fallback console log so dev testing is never blocked
      console.log(`📧 [Resend Fallback Code] OTP for ${email} is: ${otp}`);
      return false;
    }
  }
}

export const emailService = new EmailService();
