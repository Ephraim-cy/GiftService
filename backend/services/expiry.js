const cron = require('node-cron');
const Project = require('../models/Project');
const email = require('./email');

function startExpiryJob() {
  // Runs every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🕐 Running link expiry check...');

    try {
      // ── Mark expired projects ──
      const expiredResult = await Project.updateMany(
        { status: 'ready', expiresAt: { $lt: new Date() } },
        { status: 'expired' }
      );
      if (expiredResult.modifiedCount > 0) {
        console.log(`   Marked ${expiredResult.modifiedCount} project(s) as expired`);
      }

      // ── Send 24h warning emails ──
      const warningWindowStart = new Date(Date.now() + 23 * 60 * 60 * 1000);
      const warningWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const expiringSoon = await Project.find({
        status: 'ready',
        expiresAt: { $gte: warningWindowStart, $lte: warningWindowEnd },
      }).populate('user', 'email');

      for (const project of expiringSoon) {
        try {
          await email.sendExpiryWarningEmail(project.user.email, {
            recipientName: project.rawInput.recipientName,
            shareUrl: project.shareUrl,
            hoursLeft: 24,
          });
        } catch (err) {
          console.error(`   Failed to send expiry warning for project ${project._id}:`, err.message);
        }
      }

      if (expiringSoon.length > 0) {
        console.log(`   Sent ${expiringSoon.length} expiry warning email(s)`);
      }
    } catch (err) {
      console.error('Expiry cron job error:', err);
    }
  });

  console.log('✅ Link expiry cron job scheduled (runs hourly)');
}

module.exports = { startExpiryJob };
