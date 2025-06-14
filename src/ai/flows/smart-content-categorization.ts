'use server';
/**
 * @fileOverview Smart content categorization flow for categorizing posts and suggesting relevant tags.
 *
 * - categorizeContent - A function that categorizes content and suggests tags.
 * - CategorizeContentInput - The input type for the categorizeContent function.
 * - CategorizeContentOutput - The return type for the categorizeContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeContentInputSchema = z.object({
  content: z.string().describe('The content of the post to categorize.'),
});
export type CategorizeContentInput = z.infer<typeof CategorizeContentInputSchema>;

const CategorizeContentOutputSchema = z.object({
  category: z.string().describe('The category of the content.'),
  tags: z.array(z.string()).describe('Suggested tags for the content.'),
});
export type CategorizeContentOutput = z.infer<typeof CategorizeContentOutputSchema>;

export async function categorizeContent(input: CategorizeContentInput): Promise<CategorizeContentOutput> {
  return categorizeContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeContentPrompt',
  input: {schema: CategorizeContentInputSchema},
  output: {schema: CategorizeContentOutputSchema},
  prompt: `You are an expert content categorizer and tag suggestion AI.

  Given the following content, determine the most relevant category and suggest tags.

  Content: {{{content}}}

  Category: 
  Tags:`, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const categorizeContentFlow = ai.defineFlow(
  {
    name: 'categorizeContentFlow',
    inputSchema: CategorizeContentInputSchema,
    outputSchema: CategorizeContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
