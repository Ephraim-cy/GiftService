const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },

    // ── Raw input from user (what THEY provide) ──
    rawInput: {
      recipientName: { type: String, required: true },
      senderName: { type: String, required: true },
      occasion: { type: String, required: true },
      eventDate: { type: Date },
      nicknames: { type: String },
      relationshipDetails: { type: String }, // "how we met", memories, inside jokes etc
      tone: { type: String, enum: ['romantic', 'funny', 'heartfelt', 'playful', 'formal'], default: 'heartfelt' },
      language: { type: String, default: 'en' },
      customQuestions: { type: [String], default: [] }, // for proposal/quiz features
    },

    // ── Uploaded media (raw, before AI processing) ──
    uploads: {
      photos: { type: [String], default: [] }, // cloudinary URLs
      videos: { type: [String], default: [] },
      voiceRecordings: { type: [String], default: [] },
      music: { type: [String], default: [] },
    },

    // ── AI-generated content (THIS is the core value) ──
    aiGenerated: {
      writtenContent: { type: String }, // the letter/poem/speech Claude writes
      storyChapters: { type: [{ title: String, text: String }], default: [] },
      endingMessage: { type: String },
      selectedPhotos: { type: [String], default: [] }, // AI-curated best photos via Claude Vision
      enhancedPhotos: { type: [String], default: [] }, // Cloudinary AI enhanced versions
      restoredPhotos: { type: [String], default: [] }, // Replicate restored/colorized
      voiceNarrationUrl: { type: String }, // ElevenLabs generated audio
      recommendedMusicStyle: { type: String },
      generatedHtmlUrl: { type: String }, // final cinematic experience file location
      generationStatus: {
        type: String,
        enum: ['pending', 'writing', 'processing_media', 'generating_voice', 'assembling', 'completed', 'failed'],
        default: 'pending',
      },
      generationError: { type: String },
    },

    // ── Sharing & access ──
    shareableId: { type: String, required: true, unique: true }, // nanoid used in the public link
    shareUrl: { type: String },
    qrCodeUrl: { type: String },
    isPasswordProtected: { type: Boolean, default: false },
    accessPassword: { type: String },
    isOtpProtected: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    countryRestrictions: { type: [String], default: [] },

    // ── Lifecycle ──
    status: { type: String, enum: ['draft', 'paid', 'generating', 'ready', 'expired', 'deleted'], default: 'draft' },
    expiresAt: { type: Date, required: true },
    extendedCount: { type: Number, default: 0 },

    // ── Engagement summary (denormalized for fast dashboard reads) ──
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    replayCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, createdAt: -1 });
projectSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Project', projectSchema);
