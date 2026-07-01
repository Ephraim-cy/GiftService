# GiftService Backend

AI-powered digital gifting platform. The user provides photos + basic info; Claude AI writes the content, ElevenLabs generates voice narration, Replicate restores old photos, and the whole cinematic experience is auto-assembled and delivered as a shareable link.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with your real API keys
npm run dev          # starts on http://localhost:5000
```

Seed initial templates (matches the frontend template cards):

```bash
node config/seed.js
```

## Folder Structure

```
server.js              entry point
config/
  db.js                 MongoDB connection
  seed.js                template seeder
models/                 Mongoose schemas
  User.js
  Template.js
  Project.js             core entity: a generated gift experience
  Order.js
  Analytics.js
routes/
  auth.js                register/login/google/password reset
  projects.js             create draft, upload media, dashboard CRUD
  payments.js              stripe checkout + webhook
  templates.js             public template browsing
  analytics.js              public /view/:id endpoint + owner analytics
  admin.js                  admin-only management
middleware/
  auth.js                requireAuth / requireAdmin / optionalAuth
  upload.js                multer memory storage
services/
  cloudinary.js            media upload + AI enhancement
  claude.js                writes content, selects photos, builds final HTML
  elevenlabs.js             voice narration
  replicate.js               photo restoration/colorization
  stripe.js                  payments
  email.js                    resend transactional emails
  generator.js                 orchestrates the full AI pipeline
  expiry.js                     hourly cron for link expiry
```

## The Core Flow

1. `POST /api/projects` — user creates a draft project (template + their basic info: names, occasion, story details)
2. `POST /api/projects/:id/upload` — user uploads photos/videos/voice/music
3. `POST /api/payments/checkout` — creates Stripe session
4. User pays → Stripe webhook fires → `generateProject()` runs automatically:
   - Claude writes the letter/poem/speech + story chapters
   - Cloudinary enhances photos, Claude Vision picks the best ones
   - ElevenLabs narrates the written content
   - Claude assembles the final cinematic HTML experience
   - Email sent to user with their shareable link
5. Recipient opens `giftservice.com/view/:shareableId` → analytics logged → experience HTML served
6. Hourly cron checks for expiring/expired links, sends warnings, marks expired

## Deployment

- **Railway**: connect this repo, set all `.env` vars in the Railway dashboard, deploy. Railway auto-detects `npm start`.
- **MongoDB Atlas**: free tier cluster, whitelist `0.0.0.0/0` (or Railway's IP range) for connection.
- **Stripe webhook**: after deploying, add `https://your-railway-url.up.railway.app/api/payments/webhook` as an endpoint in the Stripe dashboard, copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## What's Not Yet Wired (next iterations)

- Email verification flow (token exists on User model, route stub is in auth.js)
- Coupon/discount system (mentioned in Order model as `couponCode`, needs a Coupon model + validation route)
- SMS/WhatsApp notifications (email-only for now via Resend)
- Socket.io real-time "recipient just opened your link" push (currently email-only)
