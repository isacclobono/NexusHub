'use server';
/**
 * @fileOverview This file defines a Genkit flow for intelligent content moderation.
 *
 * The flow automatically flags posts with potentially offensive or inappropriate content based on customizable sensitivity levels.
 * This helps community moderators efficiently review content and maintain a positive community environment.
 *
 * @interface IntelligentContentModerationInput - The input type for the intelligentContentModeration function.
 * @interface IntelligentContentModerationOutput - The output type for the intelligentContentModeration function.
 * @function intelligentContentModeration - A function that moderates content and returns a moderation result.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentContentModerationInputSchema = z.object({
  content: z.string().describe('The content to be moderated.'),
  sensitivityLevel: z
    .enum(['low', 'medium', 'high'])
    .default('medium')
    .describe('The sensitivity level for content moderation.'),
});
export type IntelligentContentModerationInput = z.infer<
  typeof IntelligentContentModerationInputSchema
>;

const IntelligentContentModerationOutputSchema = z.object({
  isFlagged: z.boolean().describe('Whether the content is flagged for moderation.'),
  reason: z.string().describe('The reason for flagging the content, if applicable.'),
});
export type IntelligentContentModerationOutput = z.infer<
  typeof IntelligentContentModerationOutputSchema
>;

export async function intelligentContentModeration(
  input: IntelligentContentModerationInput
): Promise<IntelligentContentModerationOutput> {
  return intelligentContentModerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentContentModerationPrompt',
  input: {schema: IntelligentContentModerationInputSchema},
  output: {schema: IntelligentContentModerationOutputSchema},
  prompt: `You are an AI content moderator responsible for flagging potentially offensive or inappropriate content.

  Content to moderate: {{{content}}}

  Sensitivity Level: {{{sensitivityLevel}}}

  Based on the content and sensitivity level, determine if the content should be flagged for moderation.

  Return a JSON object with the following schema:
  {
    "isFlagged": boolean, // true if the content should be flagged, false otherwise
    "reason": string // The reason for flagging the content.  If the content is not flagged, this should be an empty string.
  }
  `,
});

const intelligentContentModerationFlow = ai.defineFlow(
  {
    name: 'intelligentContentModerationFlow',
    inputSchema: IntelligentContentModerationInputSchema,
    outputSchema: IntelligentContentModerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
