const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'GiftService <noreply@giftservice.com>';

async function sendProjectReadyEmail(toEmail, { recipientName, shareUrl }) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your GiftService surprise for ${recipientName} is ready! 🎁`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d13;color:#fff;border-radius:16px">
        <h2 style="color:#ff2d78">Your surprise is ready! ✨</h2>
        <p>Your personalized digital experience for <strong>${recipientName}</strong> has been generated and is ready to share.</p>
        <a href="${shareUrl}" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#ff2d78,#c850c0);color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:bold">View & Share →</a>
        <p style="margin-top:24px;font-size:13px;color:#999">Link: ${shareUrl}</p>
      </div>
    `,
  });
}

async function sendExpiryWarningEmail(toEmail, { recipientName, shareUrl, hoursLeft }) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your surprise for ${recipientName} expires in ${hoursLeft} hours`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d13;color:#fff;border-radius:16px">
        <h2 style="color:#ff2d78">Your link is expiring soon ⏰</h2>
        <p>Your experience for <strong>${recipientName}</strong> will expire in approximately ${hoursLeft} hours.</p>
        <a href="${shareUrl}" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#ff2d78,#c850c0);color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:bold">Extend Now →</a>
      </div>
    `,
  });
}

async function sendLinkViewedEmail(toEmail, { recipientName }) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${recipientName} just opened your surprise! 👀`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d13;color:#fff;border-radius:16px">
        <h2 style="color:#ff2d78">They opened it! 💕</h2>
        <p><strong>${recipientName}</strong> just viewed the experience you created. Check your dashboard for full analytics.</p>
      </div>
    `,
  });
}

async function sendPaymentConfirmationEmail(toEmail, { amount, templateName }) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Payment confirmed - GiftService',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d13;color:#fff;border-radius:16px">
        <h2 style="color:#ff2d78">Payment confirmed ✓</h2>
        <p>Thanks for your purchase of <strong>${templateName}</strong> ($${(amount / 100).toFixed(2)}).</p>
        <p>Your AI is now generating your personalized experience — you'll receive another email when it's ready (usually within 2-5 minutes).</p>
      </div>
    `,
  });
}

module.exports = {
  sendProjectReadyEmail,
  sendExpiryWarningEmail,
  sendLinkViewedEmail,
  sendPaymentConfirmationEmail,
};
