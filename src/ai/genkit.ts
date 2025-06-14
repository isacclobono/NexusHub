
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: The googleAI plugin requires an API key.
// Please ensure you have GEMINI_API_KEY (or GOOGLE_API_KEY)
// set in your .env file at the root of your project.
// Example: GEMINI_API_KEY=your_api_key_here
// Without this, the Genkit server may fail to start or operate correctly.

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
