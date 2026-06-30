require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  // if (error) {
  //   console.error("SMTP Error:", error.message);
  // } else {
  //   console.log("SMTP Ready ");
  // }
});

const sendResetPasswordEmail = async (toEmail, resetLink) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Reset your password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block; padding:10px 20px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888; font-size:12px;">If the button doesn't work, copy and paste this link:<br/>${resetLink}</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetPasswordEmail };
