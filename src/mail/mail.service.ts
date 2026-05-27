import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private cleanEnv(value?: string) {
    return String(value ?? '')
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }

  private cleanAppPassword(value?: string) {
    return this.cleanEnv(value).replace(/\s+/g, '');
  }

  private createTransporter() {
    const host = this.cleanEnv(process.env.MAIL_HOST || 'smtp.gmail.com');
    const port = Number(process.env.MAIL_PORT || 465);
    const secure = String(process.env.MAIL_SECURE || 'true') === 'true';

    const user = this.cleanEnv(process.env.MAIL_USER);
    const pass = this.cleanAppPassword(process.env.MAIL_PASS);

    if (!user || !pass) {
      throw new InternalServerErrorException(
        'Konfigurasi email belum lengkap. Periksa MAIL_USER dan MAIL_PASS di .env.',
      );
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendOtpEmail(params: {
    to: string;
    name?: string | null;
    otp: string;
    purpose?: 'forgot-password' | 'change-password';
  }) {
    const transporter = this.createTransporter();

    const fromName = this.cleanEnv(process.env.MAIL_FROM_NAME || 'SkillLens');
    const fromEmail = this.cleanEnv(process.env.MAIL_USER);

    const subject =
      params.purpose === 'change-password'
        ? 'Kode OTP Ubah Password SkillLens'
        : 'Kode OTP Reset Password SkillLens';

    const displayName = params.name?.trim() || 'Pengguna SkillLens';

    const html = `
      <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 28px; border: 1px solid #e2e8f0;">
          <h2 style="margin: 0; color: #0f172a;">Kode OTP SkillLens</h2>

          <p style="margin-top: 18px; color: #334155; line-height: 1.6;">
            Halo <strong>${displayName}</strong>,
          </p>

          <p style="color: #334155; line-height: 1.6;">
            Gunakan kode OTP berikut untuk ${
              params.purpose === 'change-password'
                ? 'mengubah password akun SkillLens kamu'
                : 'mereset password akun SkillLens kamu'
            }.
          </p>

          <div style="margin: 24px 0; padding: 18px; text-align: center; background: #eff6ff; border-radius: 14px; border: 1px solid #bfdbfe;">
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">
              ${params.otp}
            </div>
          </div>

          <p style="color: #334155; line-height: 1.6;">
            Kode ini berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapa pun.
          </p>

          <p style="margin-top: 24px; color: #64748b; font-size: 13px; line-height: 1.6;">
            Jika kamu tidak meminta kode ini, abaikan email ini.
          </p>
        </div>
      </div>
    `;

    const text = `Halo ${displayName}, kode OTP SkillLens kamu adalah ${params.otp}. Kode berlaku 10 menit. Jangan berikan kode ini kepada siapa pun.`;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject,
      text,
      html,
    });

    return true;
  }
}