require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('../models/Template');

const templates = [
  {
    name: 'Romantic Love Story',
    slug: 'romantic-love-story',
    occasion: 'love-story',
    category: 'romantic',
    description: 'A cinematic love story with floating petals, animated timeline, and voice narration.',
    themeColors: ['#ff2d78', '#c850c0'],
    musicStyle: 'acoustic-romantic',
    price: 29.99,
    plan: 'basic',
    features: ['Animated timeline', 'Photo slideshow', 'Voice narration', 'Floating hearts'],
    rating: 4.9,
    reviewCount: 1200,
    isFeatured: true,
  },
  {
    name: 'Marry Me Proposal',
    slug: 'marry-me-proposal',
    occasion: 'proposal',
    category: 'luxury',
    description: 'Gold foil animations and a scratch-to-reveal proposal feature.',
    themeColors: ['#ffd700', '#ff2d78'],
    musicStyle: 'orchestral-cinematic',
    price: 49.99,
    plan: 'pro',
    features: ['Scratch to reveal', 'Proposal question', 'Fireworks finale', 'Voice narration'],
    rating: 4.9,
    reviewCount: 890,
    isFeatured: true,
  },
  {
    name: 'Birthday Surprise',
    slug: 'birthday-surprise',
    occasion: 'birthday',
    category: 'cute',
    description: 'Blow out a virtual cake and unlock birthday memories.',
    themeColors: ['#ff6b9d', '#9b27af'],
    musicStyle: 'upbeat-pop',
    price: 29.99,
    plan: 'basic',
    features: ['Virtual cake', 'Confetti', 'Memory gallery'],
    rating: 4.8,
    reviewCount: 756,
    isFeatured: true,
  },
  {
    name: 'Anniversary Memories',
    slug: 'anniversary-memories',
    occasion: 'anniversary',
    category: 'elegant',
    description: 'Relive your relationship timeline with a digital scrapbook.',
    themeColors: ['#c850c0', '#9b27af'],
    musicStyle: 'piano-ballad',
    price: 39.99,
    plan: 'pro',
    features: ['Relationship timeline', 'Before & after gallery', 'Voice messages'],
    rating: 4.8,
    reviewCount: 643,
  },
  {
    name: 'Cinematic Love Story',
    slug: 'cinematic-love-story',
    occasion: 'love-story',
    category: 'modern',
    description: 'Movie-style intro with chapters and dynamic backgrounds.',
    themeColors: ['#9b27af', '#ff2d78'],
    musicStyle: 'orchestral-cinematic',
    price: 59.99,
    plan: 'ultimate',
    features: ['Movie intro', 'Story chapters', '4K uploads', 'Custom domain'],
    rating: 4.9,
    reviewCount: 532,
  },
  {
    name: 'Cute Love Questions',
    slug: 'cute-love-questions',
    occasion: 'love-story',
    category: 'cute',
    description: 'Interactive quiz about your relationship with playful animations.',
    themeColors: ['#ff6b9d', '#ffd700'],
    musicStyle: 'lofi-soft',
    price: 19.99,
    plan: 'basic',
    features: ['Relationship quiz', 'Animated reveals', 'Heart collection game'],
    rating: 4.6,
    reviewCount: 421,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Seeding templates...');

  for (const t of templates) {
    await Template.findOneAndUpdate({ slug: t.slug }, t, { upsert: true, new: true });
    console.log(`  ✓ ${t.name}`);
  }

  console.log('Done.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
