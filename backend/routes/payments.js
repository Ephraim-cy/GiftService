const express = require('express');
const Project = require('../models/Project');
const Template = require('../models/Template');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const { createCheckoutSession, constructWebhookEvent, refundPayment } = require('../services/stripe');
const { generateProject } = require('../services/generator');
const email = require('../services/email');

const router = express.Router();

// ── CREATE CHECKOUT SESSION ──
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.body;

    const project = await Project.findOne({ _id: projectId, user: req.user._id }).populate('template');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.status !== 'draft') return res.status(400).json({ error: 'Project already paid or processed' });

    const session = await createCheckoutSession({
      userEmail: req.user.email,
      templateName: project.template.name,
      templatePriceCents: Math.round(project.template.price * 100),
      projectId: project._id.toString(),
      successUrl: `${process.env.FRONTEND_URL}/dashboard?payment=success&project=${project._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/create/${project._id}?payment=cancelled`,
    });

    await Order.create({
      user: req.user._id,
      project: project._id,
      template: project.template._id,
      amount: Math.round(project.template.price * 100),
      stripeSessionId: session.id,
      status: 'pending',
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── STRIPE WEBHOOK (raw body required - mounted before express.json() in server.js) ──
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const projectId = session.metadata.projectId;

    try {
      const order = await Order.findOneAndUpdate(
        { stripeSessionId: session.id },
        { status: 'paid', stripePaymentIntentId: session.payment_intent },
        { new: true }
      ).populate('user').populate('template');

      const project = await Project.findByIdAndUpdate(projectId, { status: 'paid' }, { new: true }).populate('user');

      if (order) {
        await email.sendPaymentConfirmationEmail(order.user.email, {
          amount: order.amount,
          templateName: order.template.name,
        });
      }

      // Kick off the AI generation pipeline asynchronously (don't block webhook response)
      generateProject(projectId).catch((err) => console.error('Background generation error:', err));
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  res.json({ received: true });
});

// ── REFUND (admin only - also exposed via admin routes, kept here for completeness) ──
router.post('/refund/:orderId', requireAuth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });

    const order = await Order.findById(req.params.orderId);
    if (!order || order.status !== 'paid') {
      return res.status(400).json({ error: 'Order not eligible for refund' });
    }

    await refundPayment(order.stripePaymentIntentId, req.body.reason);
    order.status = 'refunded';
    order.refundedAt = new Date();
    order.refundReason = req.body.reason;
    await order.save();

    res.json({ message: 'Refund processed', order });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: 'Refund failed' });
  }
});

module.exports = router;
