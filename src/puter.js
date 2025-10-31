import puter from '@heyputer/puter.js';
import dotenv from 'dotenv';

dotenv.config();

puter.init({ authToken: process.env.PUTER_AUTH_TOKEN });

export const generateImage = async (prompt) => {
  try {
    const response = await puter.ai.image(prompt, {
      model: 'dall-e-3',
    });

    if (response && response.url) {
      return response.url;
    }

    console.error('Puter.js image generation response did not contain a URL:', response);
    return null;
  } catch (error) {
    console.error('Error generating image with Puter.js:', error);
    return null;
  }
};