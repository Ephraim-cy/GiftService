const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },

    eventType: { type: String, enum: ['view', 'replay', 'click', 'complete'], default: 'view' },

    visitorId: { type: String }, // anonymized hash (IP + UA), used to compute "unique" views
    deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
    browser: { type: String },
    country: { type: String },

    timeSpentSeconds: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }, // how far through the experience they got

    clickTarget: { type: String }, // which interactive element was clicked, if eventType === 'click'
  },
  { timestamps: true }
);

analyticsSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
