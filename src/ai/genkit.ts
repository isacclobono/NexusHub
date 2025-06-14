
import { genkit, type GenkitPlugin } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const plugins: GenkitPlugin[] = [];
const defaultModel = 'googleai/gemini-2.0-flash';

// Check for the API key
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
  console.log('[Genkit Init] Google AI plugin configured with API key.');
} else {
  console.error(
    `\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
  );
  console.error(
    `[Genkit Init] CRITICAL: GEMINI_API_KEY or GOOGLE_API_KEY is missing in your .env file.`
  );
  console.error(
    `[Genkit Init] AI features requiring Google AI will NOT function until the API key is provided.`
  );
  console.error(
    `[Genkit Init] Please add GEMINI_API_KEY=your_api_key_here to your .env file and restart the server.`
  );
  console.error(
    `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`
  );
  // Genkit will be initialized without the googleAI plugin.
  // AI flows attempting to use Google AI models will likely fail at runtime.
}

export const ai = genkit({
  plugins: plugins,
  model: defaultModel, // Model is still set; calls will fail if googleAI plugin isn't loaded
});

