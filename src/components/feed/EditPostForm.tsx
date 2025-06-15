
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UsersRound, Edit } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CATEGORIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import type { Community, Post } from '@/lib/types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const DynamicQuillEditor = dynamic(() => import('@/components/editor/QuillEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full rounded-md border border-input" />,
});


const NO_COMMUNITY_VALUE = "__NONE__";
const NO_CATEGORY_SELECTED_VALUE = "__NONE__";

const postEditSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(50000, "Content can't exceed 50000 characters."),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  communityId: z.string().optional().nullable(),
});

type PostEditFormValues = z.infer<typeof postEditSchema>;

interface EditPostFormProps {
  existingPost: Post;
}

export function EditPostForm({ existingPost }: EditPostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [memberCommunities, setMemberCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);


  const form = useForm<PostEditFormValues>({
    resolver: zodResolver(postEditSchema),
    defaultValues: {
      title: existingPost.title || '',
      content: existingPost.content || '',
      category: existingPost.category || null,
      tags: Array.isArray(existingPost.tags) ? existingPost.tags.join(', ') : null,
      communityId: existingPost.communityId?.toString() || NO_COMMUNITY_VALUE,
    },
  });

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const fetchUserCommunities = async () => {
        setLoadingCommunities(true);
        try {
            const userDetailsResponse = await fetch(`/api/users/${user.id}`);
            if (userDetailsResponse.ok) {
                const userData = await userDetailsResponse.json();
                if (userData.communityIds && userData.communityIds.length > 0) {
                    const communityDetailsPromises = userData.communityIds.map((id: string) =>
                        fetch(`/api/communities/${id}`).then(res => res.json())
                    );
                    const communitiesData = await Promise.all(communityDetailsPromises);
                    setMemberCommunities(communitiesData.filter(c => c && c.id));
                } else {
                    setMemberCommunities([]);
                }
            } else {
                setMemberCommunities([]);
            }
        } catch (error) {
          console.error("Failed to fetch user's communities", error);
          setMemberCommunities([]);
        } finally {
          setLoadingCommunities(false);
        }
      };
      fetchUserCommunities();
    }
  }, [isAuthenticated, user]);


  async function onSubmit(data: PostEditFormValues) {
    if (!user || !user.id) {
      toast.error('Authentication error. Please log in again.');
      return;
    }
    if (!existingPost.id) {
      toast.error('Post ID is missing. Cannot update.');
      return;
    }
    setIsSubmitting(true);

    const updatePayload = {
      userId: user.id,
      title: data.title || undefined, // Send undefined if empty to not overwrite with empty string
      content: data.content,
      category: data.category === NO_CATEGORY_SELECTED_VALUE ? null : data.category,
      tags: data.tags, // Send string as is, API will parse or handle null/empty
      communityId: data.communityId === NO_COMMUNITY_VALUE ? NO_COMMUNITY_VALUE : (data.communityId || null), // special value to unlink
    };

    try {
      const response = await fetch(`/api/posts/${existingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.isFlagged) {
           toast.error(result.message || "Post update flagged by moderation, please revise.", { duration: 7000 });
        } else if (result.errors) {
            let errorMessages = Object.values(result.errors).flat().join('\n');
            toast.error(`Post update failed:\n${errorMessages}`, { duration: 6000 });
        } else {
            throw new Error(result.message || `Error: ${response.status}`);
        }
      } else {
        toast.success(`Post "${result.title || 'Untitled'}" updated successfully.`);
        router.push(`/posts/${existingPost.id}`);
      }
    } catch (error) {
      console.error("Error updating post:", error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
      toast.error(`An unexpected error occurred: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loadingCommunities) {
    return <div className="container mx-auto py-8 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center"><Edit className="mr-2 h-6 w-6 text-primary"/> Edit Post</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">You are editing your post: <Link href={`/posts/${existingPost.id}`} className="text-primary hover:underline">{existingPost.title || "Untitled Post"}</Link></p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your amazing post title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                     <DynamicQuillEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Share your thoughts..."
                    />
                  </FormControl>
                   <FormDescription>
                    Your post content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {memberCommunities.length > 0 && (
                <FormField
                control={form.control}
                name="communityId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center"><UsersRound className="mr-2 h-4 w-4 text-muted-foreground"/>Post to a Community (Optional)</FormLabel>
                    <Select
                        onValueChange={(value) => field.onChange(value)}
                        value={field.value === null ? NO_COMMUNITY_VALUE : (field.value || NO_COMMUNITY_VALUE)}
                        disabled={loadingCommunities}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingCommunities ? "Loading communities..." : "Select a community (optional)"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value={NO_COMMUNITY_VALUE}>None (Remove from community / Post to main feed)</SelectItem>
                        {memberCommunities.map(community => (
                            <SelectItem key={community.id!} value={community.id!}>{community.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>Change the community association or remove it.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_CATEGORY_SELECTED_VALUE ? null : value)}
                    value={field.value === null ? NO_CATEGORY_SELECTED_VALUE : (field.value || '')}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value={NO_CATEGORY_SELECTED_VALUE}>(No Category)</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., tech, community, discussion" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Comma-separated list of tags. Leave blank to clear.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
               <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading} className="btn-gradient min-w-[120px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
