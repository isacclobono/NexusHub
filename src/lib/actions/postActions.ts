'use server';

import { z } from 'zod';
import type { Post, User } from '@/lib/types';
import { getCurrentUser, mockPosts } from '@/lib/mock-data'; // Assuming mock data for now
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';


const postFormSchema = z.object({
  title: z.string().max(150).optional(),
  content: z.string().min(1).max(5000),
  category: z.string().optional(),
  tags: z.string().optional(),
  media: z.any().optional(),
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

export async function createPostAction(
  data: PostFormValues
): Promise<{ success: boolean; post?: Post; error?: string }> {
  const validation = postFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors_toString() };
  }

  const currentUser = getCurrentUser(); // In a real app, get this from session
  if (!currentUser) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Simulate AI Moderation (already done in form, but could be re-checked here)
  // const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
  // const moderationResult = await intelligentContentModeration(moderationInput);
  // if (moderationResult.isFlagged) {
  //   return { success: false, error: `Content flagged: ${moderationResult.reason}` };
  // }

  // Simulate AI Categorization if not provided (already done in form, but for direct API calls)
  // let category = data.category;
  // let tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  // if (!category && data.content.length > 20) {
  //   try {
  //     const categorizationInput: CategorizeContentInput = { content: data.content };
  //     const categorizationResult = await categorizeContent(categorizationInput);
  //     category = categorizationResult.category;
  //     if (tagsArray.length === 0) {
  //       tagsArray = categorizationResult.tags;
  //     }
  //   } catch (aiError) {
  //     console.warn('AI categorization failed during server action:', aiError);
  //   }
  // }


  const newPost: Post = {
    id: `post${Date.now()}`,
    author: currentUser,
    title: data.title,
    content: data.content,
    category: data.category, // or use AI suggested category
    tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [], // or use AI suggested tags
    createdAt: new Date().toISOString(),
    reactions: [],
    comments: [],
    commentCount: 0,
    status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
    scheduledAt: data.scheduledAt?.toISOString(),
    // media handling would be more complex, involving file storage
  };

  // In a real app, save to database
  mockPosts.unshift(newPost); 
  console.log('New post created (mock):', newPost);

  // Revalidate relevant paths if using Next.js caching and server components for feed
  // revalidatePath('/');
  // revalidatePath('/feed');

  return { success: true, post: newPost };
}
