const express = require('express');
const { nanoid } = require('nanoid');
const Project = require('../models/Project');
const Template = require('../models/Template');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBuffer } = require('../services/cloudinary');

const router = express.Router();

const DEFAULT_EXPIRY_HOURS = parseInt(process.env.DEFAULT_LINK_EXPIRY_HOURS || '48', 10);

// ── CREATE DRAFT PROJECT (before payment) ──
router.post('/', requireAuth, async (req, res) => {
  try {
    const { templateId, rawInput } = req.body;

    const template = await Template.findById(templateId);
    if (!template || !template.isActive) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const shareableId = nanoid(12);
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

    const project = await Project.create({
      user: req.user._id,
      template: template._id,
      rawInput,
      shareableId,
      shareUrl: `${process.env.APP_BASE_URL}/view/${shareableId}`,
      expiresAt,
      status: 'draft',
    });

    res.status(201).json({ project });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ── UPLOAD MEDIA TO A DRAFT PROJECT ──
router.post('/:id/upload', requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { mediaType } = req.body; // 'photos' | 'videos' | 'voiceRecordings' | 'music'
    if (!['photos', 'videos', 'voiceRecordings', 'music'].includes(mediaType)) {
      return res.status(400).json({ error: 'Invalid mediaType' });
    }

    const resourceTypeMap = { photos: 'image', videos: 'video', voiceRecordings: 'video', music: 'video' };
    const urls = [];

    for (const file of req.files) {
      const result = await uploadBuffer(
        file.buffer,
        `giftservice/projects/${project._id}/${mediaType}`,
        resourceTypeMap[mediaType]
      );
      urls.push(result.secure_url);
    }

    project.uploads[mediaType].push(...urls);
    await project.save();

    res.json({ uploaded: urls, project });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── GET USER'S DASHBOARD (all their projects) ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user._id })
      .populate('template', 'name slug thumbnailUrl price')
      .sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ── GET SINGLE PROJECT (owner view, with full analytics summary) ──
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id }).populate('template');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ── UPDATE PROJECT (edit before/after generation; triggers regeneration if already completed) ──
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { rawInput, isPasswordProtected, accessPassword, isOtpProtected, isHidden, countryRestrictions } = req.body;

    if (rawInput) project.rawInput = { ...project.rawInput.toObject(), ...rawInput };
    if (typeof isPasswordProtected === 'boolean') project.isPasswordProtected = isPasswordProtected;
    if (accessPassword) project.accessPassword = accessPassword;
    if (typeof isOtpProtected === 'boolean') project.isOtpProtected = isOtpProtected;
    if (typeof isHidden === 'boolean') project.isHidden = isHidden;
    if (countryRestrictions) project.countryRestrictions = countryRestrictions;

    await project.save();
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ── DUPLICATE PROJECT ──
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const original = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!original) return res.status(404).json({ error: 'Project not found' });

    const shareableId = nanoid(12);
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

    const copy = await Project.create({
      user: req.user._id,
      template: original.template,
      rawInput: original.rawInput,
      uploads: original.uploads,
      shareableId,
      shareUrl: `${process.env.APP_BASE_URL}/view/${shareableId}`,
      expiresAt,
      status: 'draft',
    });

    res.status(201).json({ project: copy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate project' });
  }
});

// ── EXTEND EXPIRATION ──
router.post('/:id/extend', requireAuth, async (req, res) => {
  try {
    const { additionalHours } = req.body; // computed from purchased add-on (7d/30d/etc converted to hours)
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const base = project.expiresAt > new Date() ? project.expiresAt : new Date();
    project.expiresAt = new Date(base.getTime() + additionalHours * 60 * 60 * 1000);
    project.status = project.status === 'expired' ? 'ready' : project.status;
    project.extendedCount += 1;
    await project.save();

    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extend project' });
  }
});

// ── DELETE PROJECT ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'deleted' },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
