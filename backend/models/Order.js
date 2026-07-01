const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },

    amount: { type: Number, required: true }, // in cents
    currency: { type: String, default: 'usd' },

    stripePaymentIntentId: { type: String },
    stripeSessionId: { type: String },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },

    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },

    addOns: {
      extendedExpiry: { type: String }, // '7d' | '30d' | '90d' | '1y' | 'lifetime'
      expressGeneration: { type: Boolean, default: false },
      removeBranding: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
    },

    invoiceUrl: { type: String },
    refundedAt: { type: Date },
    refundReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
