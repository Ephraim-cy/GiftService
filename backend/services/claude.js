const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

/**
 * Writes the core personalized content (letter, poem, speech, wishes, story chapters)
 * based on the raw input the user provided.
 */
async function writeContent({ occasion, recipientName, senderName, nicknames, relationshipDetails, tone, language, customQuestions }) {
  const prompt = `You are a world-class romantic ghostwriter creating a personalized digital gift experience.

Occasion: ${occasion}
Recipient: ${recipientName}
Sender: ${senderName}
Nicknames used between them: ${nicknames || 'none provided'}
Relationship details / memories / story shared by the sender: ${relationshipDetails || 'none provided'}
Desired tone: ${tone}
Language: ${language}
${customQuestions?.length ? `Custom questions to weave in: ${customQuestions.join(', ')}` : ''}

Write the following, using ONLY the details provided above (do not invent specific facts, but you may use general warm sentiment):
1. A main written piece (letter/poem/speech/wishes depending on occasion) — 150-300 words
2. 3-5 short "story chapter" titles and texts (20-40 words each) that could be used in an animated timeline
3. A short, powerful ending message (1-2 sentences)

Respond ONLY in valid JSON, no preamble, in this exact shape:
{
  "writtenContent": "...",
  "storyChapters": [{"title": "...", "text": "..."}],
  "endingMessage": "..."
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Claude content response:', cleaned);
    throw new Error('AI content generation returned invalid format');
  }
}

/**
 * Uses Claude Vision to look at uploaded photos and pick the best ones / order them
 * for a slideshow. Expects an array of { url, base64, mediaType } for up to ~10 photos.
 */
async function selectBestPhotos(photos) {
  if (!photos.length) return [];

  const content = [
    {
      type: 'text',
      text: `You are selecting and ordering the best photos for a romantic slideshow. Here are ${photos.length} candidate photos. Return ONLY a JSON array of indices (0-based) in the best display order, prioritizing photo quality, emotional warmth, and clarity. Exclude blurry or low-quality ones if there are better alternatives. Respond ONLY with the JSON array, e.g. [2,0,4,1].`,
    },
    ...photos.map((p) => ({
      type: 'image',
      source: { type: 'base64', media_type: p.mediaType, data: p.base64 },
    })),
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '[]';
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    const indices = JSON.parse(cleaned);
    return indices.map((i) => photos[i]?.url).filter(Boolean);
  } catch (err) {
    console.error('Failed to parse photo selection:', cleaned);
    return photos.map((p) => p.url); // fallback: keep original order
  }
}

/**
 * Recommends a music style/mood based on occasion + tone (used to pick from a curated library).
 */
async function recommendMusic({ occasion, tone }) {
  const prompt = `For a digital gift experience with occasion "${occasion}" and tone "${tone}", recommend ONE music style from this list that fits best: [acoustic-romantic, orchestral-cinematic, piano-ballad, upbeat-pop, gentle-ambient, jazz-warm, choir-emotional, lofi-soft]. Respond with ONLY the single style name, nothing else.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 20,
    messages: [{ role: 'user', content: prompt }],
  });

  return (response.content.find((b) => b.type === 'text')?.text || 'gentle-ambient').trim();
}

/**
 * Generates the final cinematic experience as a self-contained HTML string,
 * using the template's layoutConfig as a structural guide and the AI-written content + media.
 */
async function buildExperienceHtml({ template, project }) {
  const prompt = `You are an expert frontend engineer building a single-file, self-contained HTML cinematic "digital gift" experience.

Template style reference: ${JSON.stringify(template.layoutConfig || {})}
Theme colors: ${(template.themeColors || []).join(', ') || 'pink/purple romantic neon'}
Occasion: ${project.rawInput.occasion}

Content to embed:
- Recipient: ${project.rawInput.recipientName}
- Sender: ${project.rawInput.senderName}
- Main written content: ${project.aiGenerated.writtenContent}
- Story chapters: ${JSON.stringify(project.aiGenerated.storyChapters)}
- Ending message: ${project.aiGenerated.endingMessage}
- Photo URLs (use as <img> sources, in this order): ${JSON.stringify(project.aiGenerated.selectedPhotos)}
- Voice narration audio URL (if present, autoplay-on-interaction with an <audio> tag): ${project.aiGenerated.voiceNarrationUrl || 'none'}
- Music style: ${project.aiGenerated.recommendedMusicStyle || 'gentle-ambient'}

Build a complete, single HTML file (inline CSS + JS, no external dependencies except Google Fonts) with:
- A movie-style intro / loading animation
- The story chapters as an animated, scrollable or tappable timeline
- Photos displayed in an elegant slideshow or floating gallery
- The main written content displayed with cinematic typography reveal
- Floating particle effects (hearts/sparkles matching the occasion)
- A final celebration screen with the ending message
- Fully responsive, mobile-first

Respond ONLY with the raw HTML, starting with <!DOCTYPE html> and nothing else before or after.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const html = response.content.find((b) => b.type === 'text')?.text || '';
  return html.replace(/```html|```/g, '').trim();
}

module.exports = { writeContent, selectBestPhotos, recommendMusic, buildExperienceHtml };
