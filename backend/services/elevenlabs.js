const axios = require('axios');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Generates voice narration audio from text using ElevenLabs.
 * Returns a Buffer of mp3 audio data — caller is responsible for uploading to Cloudinary.
 */
async function generateNarration(text, voiceId = process.env.ELEVENLABS_VOICE_ID) {
  const response = await axios.post(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

/**
 * Lists available voices (useful for letting users pick a narrator voice in the UI).
 */
async function listVoices() {
  const response = await axios.get(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
  });
  return response.data.voices;
}

module.exports = { generateNarration, listVoices };
