import { init } from '@heyputer/puter.js/src/init.cjs';
import dotenv from 'dotenv';

dotenv.config();

const puter = init(process.env.PUTER_AUTH_TOKEN);

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