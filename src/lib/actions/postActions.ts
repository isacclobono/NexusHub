
'use server';

import { z } from 'zod';
import type { Post, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/mock-data'; // Adjusted to fetch current user
// Note: Direct manipulation of mockPosts array is removed as data is now from static JSON files.
// Full persistence would require a backend API.

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
    // Convert ZodError to a string message
    const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMessages };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated.' };
  }
  
  // AI Moderation and Categorization would still work as they are API calls.
  // This part is simplified as it's already in CreatePostForm.tsx.

  const newPost: Post = {
    id: `post${Date.now()}`, // Temporary ID generation
    authorId: currentUser.id,
    author: currentUser, // Include author object for immediate UI update if needed
    title: data.title,
    content: data.content,
    category: data.category,
    tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    createdAt: new Date().toISOString(),
    reactions: [],
    commentIds: [],
    comments: [],
    commentCount: 0,
    status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
    scheduledAt: data.scheduledAt?.toISOString(),
    // media handling would be more complex
  };

  // IMPORTANT: This action currently does NOT persist the post to any JSON file.
  // It simulates a successful creation for the frontend.
  // For actual data persistence, a backend API that can write to a database or files is needed.
  console.log('Simulated new post created (not persisted to JSON):', newPost);

  // To make the UI update optimistically if needed, you might return the post.
  // Revalidation of paths (e.g., revalidatePath('/feed')) would be necessary if using
  // server-side caching that needs to be busted after a new post.
  // Since we are fetching client-side from static JSON, revalidation has no effect here.

  return { success: true, post: newPost };
}
