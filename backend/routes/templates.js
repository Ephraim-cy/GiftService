const express = require('express');
const Template = require('../models/Template');

const router = express.Router();

// ── LIST/FILTER TEMPLATES ──
router.get('/', async (req, res) => {
  try {
    const { occasion, category, plan, featured } = req.query;
    const filter = { isActive: true };

    if (occasion) filter.occasion = occasion;
    if (category) filter.category = category;
    if (plan) filter.plan = plan;
    if (featured === 'true') filter.isFeatured = true;

    const templates = await Template.find(filter).sort({ isFeatured: -1, reviewCount: -1 });
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ── SINGLE TEMPLATE DETAIL ──
router.get('/:slug', async (req, res) => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, isActive: true });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

module.exports = router;
