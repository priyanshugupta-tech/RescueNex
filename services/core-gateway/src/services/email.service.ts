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

  /**
   * Dispatches high-priority Disaster Evacuation Alert Email to commuters
   * who do not have an active verified mobile number registered.
   */
  public async sendEvacuationAlertEmail(
    email: string,
    alert: { riskLevel: string; message?: string },
    sector: { name: string; highwayCode?: string },
    distanceKm?: number
  ): Promise<{ success: boolean; error?: any }> {
    const distanceText = typeof distanceKm === 'number' ? `${distanceKm} km from your transit location` : 'within your 10 km corridor';
    const alertColor = alert.riskLevel === 'CRITICAL' ? '#dc2626' : '#d97706';

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>URGENT: Landslide Evacuation Notice</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background-color: #111827; border: 2px solid ${alertColor}; box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 32px; text-align: left;">
          <tr>
            <td style="border-bottom: 1px solid #374151; padding-bottom: 16px;">
              <span style="font-size: 11px; font-weight: 800; color: ${alertColor}; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">
                [ RESCUENEX DISASTER EVACUATION BROADCAST ]
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px;">
              <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">
                ⚠️ ${alert.riskLevel} Landslide Hazard
              </h1>
              <p style="font-size: 14px; line-height: 22px; color: #e5e7eb; margin: 0 0 20px 0;">
                An immediate landslide / slope destabilization has been detected at <strong>${sector.name}</strong> (${distanceText}).
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; border-left: 4px solid ${alertColor}; padding: 16px; margin: 16px 0;">
              <p style="font-family: monospace; font-size: 13px; color: #f9fafb; margin: 0 0 8px 0; font-weight: bold;">
                MANDATORY SAFETY ACTIONS:
              </p>
              <ul style="font-size: 13px; color: #d1d5db; margin: 0; padding-left: 20px; line-height: 20px;">
                <li>Halt your vehicle immediately in a safe, open zone away from cut slopes.</li>
                <li>Do NOT attempt to cross active mud, rockfall, or shooting-stone corridors.</li>
                <li>Listen for local acoustic sirens and await BRO/SDRF clearance.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px;">
              <p style="font-size: 12px; color: #9ca3af; line-height: 18px; margin: 0 0 12px 0;">
                <em>Note: You received this notice via email because your mobile phone number is not yet registered/verified for instant SMS dispatch. To receive instantaneous SMS alerts within 10 km, please add your phone number on your RescueNex dashboard.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #374151; font-size: 11px; color: #6b7280; text-align: center; font-family: monospace;">
              &copy; 2026 RescueNex National Early Warning Platform • Ministry of Disaster Management
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
      console.log(`📧 [Resend Dev Mode] Evacuation Email for: ${email}`);
      console.log(`🚨 SECTOR: ${sector.name} | LEVEL: ${alert.riskLevel} | DISTANCE: ${distanceText}`);
      console.log(`======================================================\n`);
      return { success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.senderEmail,
        to: [email],
        subject: `🚨 RESCUENEX EVACUATION ALERT: ${alert.riskLevel} Landslide at ${sector.name}`,
        html: htmlTemplate
      });

      if (response.error) {
        console.error('⚠️ [Resend Error]:', response.error);
        return { success: false, error: response.error };
      }

      console.log(`✅ [Evacuation Email] Dispatched to ${email}`);
      return { success: true };
    } catch (err: any) {
      console.error('⚠️ [Resend Email Exception]:', err.message);
      return { success: false, error: err };
    }
  }
}

export const emailService = new EmailService();
