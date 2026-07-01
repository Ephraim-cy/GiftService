const Project = require('../models/Project');
const Template = require('../models/Template');
const claude = require('./claude');
const elevenlabs = require('./elevenlabs');
const replicate = require('./replicate');
const { uploadBuffer, getEnhancedUrl } = require('./cloudinary');
const email = require('./email');
const axios = require('axios');

/**
 * The full pipeline. Called after payment is confirmed.
 * Each stage updates project.aiGenerated.generationStatus so the dashboard can show live progress.
 */
async function generateProject(projectId) {
  const project = await Project.findById(projectId).populate('user').populate('template');
  if (!project) throw new Error('Project not found');

  try {
    // ── STAGE 1: AI writes the content ──
    project.aiGenerated.generationStatus = 'writing';
    await project.save();

    const written = await claude.writeContent({
      occasion: project.rawInput.occasion,
      recipientName: project.rawInput.recipientName,
      senderName: project.rawInput.senderName,
      nicknames: project.rawInput.nicknames,
      relationshipDetails: project.rawInput.relationshipDetails,
      tone: project.rawInput.tone,
      language: project.rawInput.language,
      customQuestions: project.rawInput.customQuestions,
    });

   project.aiGenerated.writtenContent = written.writtenContent;
project.aiGenerated.storyChapters = written.storyChapters;
project.aiGenerated.endingMessage = written.endingMessage;
project.aiGenerated.recommendedMusicStyle = written.recommendedMusicStyle;
await project.save();

    // ── STAGE 2: Process media (enhance, restore, select best photos) ──
    project.aiGenerated.generationStatus = 'processing_media';
    await project.save();

    // Auto-enhance every uploaded photo via Cloudinary transforms (fast, no extra API calls)
    const enhancedPhotos = project.uploads.photos.map((url) => {
      const publicId = extractPublicId(url);
      return getEnhancedUrl(publicId);
    });
    project.aiGenerated.enhancedPhotos = enhancedPhotos;

    // Optionally restore/colorize photos flagged as "old" — for v1 we run it on all if user requested
    // (Hook this up to a per-photo flag from the frontend in a later iteration)

    // Let Claude Vision pick + order the best shots for the slideshow
    const photoPayloads = await Promise.all(
      enhancedPhotos.slice(0, 10).map(async (url) => {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        return {
          url,
          base64: Buffer.from(res.data).toString('base64'),
          mediaType: res.headers['content-type'] || 'image/jpeg',
        };
      })
    );
    project.aiGenerated.selectedPhotos = await claude.selectBestPhotos(photoPayloads);
    await project.save();

   // ── STAGE 3: Voice narration ──
// Temporarily disabled — ElevenLabs free tier forbids commercial use of the audio.
// Re-enable once you have a paid ElevenLabs plan or a self-hosted TTS alternative.
project.aiGenerated.generationStatus = 'generating_voice';
await project.save();
// (skipped for now — project.aiGenerated.voiceNarrationUrl stays unset)
    // ── STAGE 4: Assemble final cinematic HTML experience ──
    project.aiGenerated.generationStatus = 'assembling';
    await project.save();

    const html = await claude.buildExperienceHtml({ template: project.template, project });
    const htmlUpload = await uploadBuffer(Buffer.from(html, 'utf-8'), `giftservice/projects/${project._id}/experience`, 'raw');
    project.aiGenerated.generatedHtmlUrl = htmlUpload.secure_url;

    // ── STAGE 5: Done ──
    project.aiGenerated.generationStatus = 'completed';
    project.status = 'ready';
    await project.save();

    await email.sendProjectReadyEmail(project.user.email, {
      recipientName: project.rawInput.recipientName,
      shareUrl: project.shareUrl,
    });

    return project;
  } catch (err) {
  console.error(`Generation failed for project ${projectId}:`, err.response?.data || err.message);
    project.aiGenerated.generationStatus = 'failed';
    project.aiGenerated.generationError = err.message;
    await project.save();
    throw err;
  }
}

function extractPublicId(cloudinaryUrl) {
  // e.g. https://res.cloudinary.com/demo/image/upload/v123/giftservice/projects/abc/photo.jpg
  const parts = cloudinaryUrl.split('/upload/')[1];
  if (!parts) return cloudinaryUrl;
  return parts.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
}

module.exports = { generateProject };
