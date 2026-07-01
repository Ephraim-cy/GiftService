const axios = require('axios');

const REPLICATE_BASE = 'https://api.replicate.com/v1';

// Public model versions for restoration/colorization (GFPGAN for restoration, DeOldify for colorization)
const MODELS = {
  restore: 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976529c0269d51',
  colorize: 'arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f26ef158e9135afa2c52a8f15c9',
};

async function runPrediction(modelVersion, input) {
  const create = await axios.post(
    `${REPLICATE_BASE}/predictions`,
    { version: modelVersion.split(':')[1], input },
    { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
  );

  let prediction = create.data;

  // Poll until done (Replicate is async)
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await axios.get(`${REPLICATE_BASE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    prediction = poll.data;
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  return prediction.output; // URL of the resulting image
}

async function restorePhoto(imageUrl) {
  return runPrediction(MODELS.restore, { img: imageUrl, version: 'v1.4', scale: 2 });
}

async function colorizePhoto(imageUrl) {
  return runPrediction(MODELS.colorize, { input_image: imageUrl, model_name: 'Artistic', render_factor: 35 });
}

module.exports = { restorePhoto, colorizePhoto };
