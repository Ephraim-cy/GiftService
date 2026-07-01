const express = require('express');
const User = require('../models/User');
const Template = require('../models/Template');
const Order = require('../models/Order');
const Project = require('../models/Project');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// ── USERS ──
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(200);
  res.json({ users });
});

router.patch('/users/:id', async (req, res) => {
  const { plan, isAdmin } = req.body;
  const update = {};
  if (plan) update.plan = plan;
  if (typeof isAdmin === 'boolean') update.isAdmin = isAdmin;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  res.json({ user });
});

// ── TEMPLATES ──
router.post('/templates', async (req, res) => {
  const template = await Template.create(req.body);
  res.status(201).json({ template });
});

router.patch('/templates/:id', async (req, res) => {
  const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ template });
});

router.delete('/templates/:id', async (req, res) => {
  await Template.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Template deactivated' });
});

router.patch('/templates/:id/feature', async (req, res) => {
  const template = await Template.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true });
  res.json({ template });
});

// ── ORDERS ──
router.get('/orders', async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').populate('template', 'name').sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
});

// ── REVENUE ANALYTICS ──
router.get('/revenue', async (req, res) => {
  const paidOrders = await Order.find({ status: 'paid' });
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentOrders = paidOrders.filter((o) => o.createdAt >= last30Days);
  const recentRevenue = recentOrders.reduce((sum, o) => sum + o.amount, 0);

  const totalUsers = await User.countDocuments();
  const totalProjects = await Project.countDocuments();

  res.json({
    totalRevenueCents: totalRevenue,
    last30DaysRevenueCents: recentRevenue,
    totalOrders: paidOrders.length,
    totalUsers,
    totalProjects,
  });
});

module.exports = router;
