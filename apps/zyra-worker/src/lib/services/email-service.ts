import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
  // Primary transport
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: !!process.env.SMTP_SECURE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.body,
    });
    return { messageId: info.messageId };
  } catch (err: any) {
    // Fallback to Ethereal in development
    if (process.env.NODE_ENV !== 'production' && err.code === 'ECONNREFUSED') {
      console.warn('SMTP connect failed, using Ethereal test account');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await transporter.sendMail({
        from: testAccount.user,
        to: options.to,
        subject: options.subject,
        text: options.body,
      });
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      return { messageId: info.messageId };
    }
    throw err;
  }
}
