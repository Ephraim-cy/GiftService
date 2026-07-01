const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    occasion: {
      type: String,
      required: true,
      enum: [
        'love-story', 'proposal', 'anniversary', 'birthday', 'valentines',
        'christmas', 'new-year', 'mothers-day', 'fathers-day', 'graduation',
        'baby-shower', 'congratulations', 'thank-you', 'apology', 'farewell',
        'friendship', 'love-letter', 'wedding', 'party-invite', 'save-the-date',
        'memorial', 'custom',
      ],
    },
    category: {
      type: String,
      enum: ['romantic', 'elegant', 'minimal', 'luxury', 'cute', 'modern', 'neon', 'fantasy', 'nature', 'seasonal'],
      default: 'romantic',
    },
    description: { type: String },
    thumbnailUrl: { type: String },
    previewVideoUrl: { type: String },
    themeColors: { type: [String], default: [] },
    musicStyle: { type: String },
    price: { type: Number, required: true },
    plan: { type: String, enum: ['basic', 'pro', 'ultimate'], default: 'basic' },
    features: { type: [String], default: [] },
    layoutConfig: { type: mongoose.Schema.Types.Mixed }, // animation/section structure used by generator
    rating: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
