const express = require('express');
const crypto = require('crypto');
const Project = require('../models/Project');
const Analytics = require('../models/Analytics');
const { requireAuth } = require('../middleware/auth');
const email = require('../services/email');

const router = express.Router();

function detectDeviceType(userAgent = '') {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mozilla|chrome|safari|firefox/i.test(userAgent)) return 'desktop';
  return 'unknown';
}

// ── PUBLIC: RECIPIENT OPENS THE LINK ──
// GET /view/:shareableId  (this would typically be proxied by the frontend SPA route, this returns the project data)
router.get('/view/:shareableId', async (req, res) => {
  try {
    const project = await Project.findOne({ shareableId: req.params.shareableId }).populate('user', 'email');

    if (!project || project.status === 'deleted' || project.isHidden) {
      return res.status(404).json({ error: 'This experience could not be found' });
    }

    if (project.expiresAt < new Date()) {
      if (project.status !== 'expired') {
        project.status = 'expired';
        await project.save();
      }
      return res.status(410).json({ error: 'This experience has expired', expired: true });
    }

    if (project.status !== 'ready') {
      return res.status(202).json({ error: 'This experience is still being generated', status: project.aiGenerated.generationStatus });
    }

    if (project.isPasswordProtected) {
      const providedPassword = req.query.password;
      if (providedPassword !== project.accessPassword) {
        return res.status(401).json({ error: 'Password required', requiresPassword: true });
      }
    }

    // ── Log the view event ──
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const visitorId = crypto.createHash('sha256').update(ip + userAgent).digest('hex');

    const isFirstViewFromVisitor = !(await Analytics.exists({ project: project._id, visitorId }));

    await Analytics.create({
      project: project._id,
      eventType: isFirstViewFromVisitor ? 'view' : 'replay',
      visitorId,
      deviceType: detectDeviceType(userAgent),
      browser: userAgent,
      country: req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || 'unknown',
    });

    project.totalViews += 1;
    if (isFirstViewFromVisitor) project.uniqueViews += 1;
    else project.replayCount += 1;
    project.lastViewedAt = new Date();
    await project.save();

    // Notify the sender on first view only
    if (isFirstViewFromVisitor && project.totalViews === 1) {
      email.sendLinkViewedEmail(project.user.email, { recipientName: project.rawInput.recipientName }).catch(() => {});
    }

    res.json({
      experienceUrl: project.aiGenerated.generatedHtmlUrl,
      recipientName: project.rawInput.recipientName,
      occasion: project.rawInput.occasion,
    });
  } catch (err) {
    console.error('View tracking error:', err);
    res.status(500).json({ error: 'Failed to load experience' });
  }
});

// ── PUBLIC: LOG COMPLETION / TIME SPENT (called by the experience HTML itself via fetch beacon) ──
router.post('/view/:shareableId/event', async (req, res) => {
  try {
    const project = await Project.findOne({ shareableId: req.params.shareableId });
    if (!project) return res.status(404).end();

    const { eventType, timeSpentSeconds, completionPercentage, clickTarget } = req.body;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const visitorId = crypto.createHash('sha256').update(ip + userAgent).digest('hex');

    await Analytics.create({
      project: project._id,
      eventType: eventType || 'complete',
      visitorId,
      deviceType: detectDeviceType(userAgent),
      timeSpentSeconds,
      completionPercentage,
      clickTarget,
    });

    res.status(204).end();
  } catch (err) {
    res.status(500).end();
  }
});

// ── OWNER: GET FULL ANALYTICS FOR A PROJECT ──
router.get('/:projectId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, user: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const events = await Analytics.find({ project: project._id }).sort({ createdAt: -1 }).limit(500);

    const deviceBreakdown = {};
    const countryBreakdown = {};
    let totalCompletion = 0;
    let completionSamples = 0;

    events.forEach((e) => {
      deviceBreakdown[e.deviceType] = (deviceBreakdown[e.deviceType] || 0) + 1;
      countryBreakdown[e.country] = (countryBreakdown[e.country] || 0) + 1;
      if (e.completionPercentage) {
        totalCompletion += e.completionPercentage;
        completionSamples += 1;
      }
    });

    res.json({
      summary: {
        totalViews: project.totalViews,
        uniqueViews: project.uniqueViews,
        replayCount: project.replayCount,
        lastViewedAt: project.lastViewedAt,
        avgCompletionPercentage: completionSamples ? Math.round(totalCompletion / completionSamples) : 0,
      },
      deviceBreakdown,
      countryBreakdown,
      recentEvents: events.slice(0, 50),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
