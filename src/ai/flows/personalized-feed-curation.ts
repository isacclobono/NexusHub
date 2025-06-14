// src/ai/flows/personalized-feed-curation.ts
'use server';

/**
 * @fileOverview Personalized feed curation AI agent.
 *
 * - personalizeFeed - A function that curates the community feed based on user interactions.
 * - PersonalizeFeedInput - The input type for the personalizeFeed function.
 * - PersonalizeFeedOutput - The return type for the personalizeFeed function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeFeedInputSchema = z.object({
  userHistory: z
    .string()
    .describe(
      'A summary of the users past interactions and interests within the community, including viewed posts, comments, reactions, and followed tags/categories.'
    ),
  availablePosts: z
    .string()
    .describe('A list of available community posts with titles and descriptions.'),
});
export type PersonalizeFeedInput = z.infer<typeof PersonalizeFeedInputSchema>;

const PersonalizeFeedOutputSchema = z.object({
  curatedFeed: z
    .string()
    .describe(
      'A curated list of community post titles that are most relevant to the user, ordered by relevance.'
    ),
  reasoning: z
    .string()
    .describe(
      'A brief explanation of why these posts were selected for the user, based on their history and interests.'
    ),
});
export type PersonalizeFeedOutput = z.infer<typeof PersonalizeFeedOutputSchema>;

export async function personalizeFeed(input: PersonalizeFeedInput): Promise<PersonalizeFeedOutput> {
  return personalizeFeedFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeFeedPrompt',
  input: {schema: PersonalizeFeedInputSchema},
  output: {schema: PersonalizeFeedOutputSchema},
  prompt: `You are an AI assistant designed to curate a community feed for users based on their past interactions and interests.

  Given the following user history:
  {{userHistory}}

  And the following available community posts:
  {{availablePosts}}

  Create a curated feed of the most relevant post titles for the user, ordered by relevance. Also, provide a brief explanation of why these posts were selected for the user, based on their history and interests.

  Ensure the response is formatted for easy parsing.
  `,
});

const personalizeFeedFlow = ai.defineFlow(
  {
    name: 'personalizeFeedFlow',
    inputSchema: PersonalizeFeedInputSchema,
    outputSchema: PersonalizeFeedOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export default personalizeFeed;








