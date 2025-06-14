
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form'; // Added Controller
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
import { Switch } from '@/components/ui/switch';
import { Loader2, UploadCloud, Sparkles, Lightbulb, Calendar as CalendarIcon, UsersRound } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CATEGORIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categorizeContent as callCategorizeContentAI } from '@/ai/flows/smart-content-categorization';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import type { Community } from '@/lib/types';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <Skeleton className="h-[150px] w-full rounded-md border border-input" />
});

const NO_COMMUNITY_VALUE = "__NONE__";

const postFormSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(15000, "Content can't exceed 15000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(),
  media: z.any().optional(),
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
  communityId: z.string().optional(),
}).refine(data => !data.scheduledAt || data.scheduledAt > new Date(), {
    message: "Scheduled date must be in the future.",
    path: ["scheduledAt"],
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface CreatePostFormProps {
  preselectedCommunityId?: string;
}

const GenAICallout = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
  <div className="mt-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex">
    <Icon className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-1" />
    <div>
      <h4 className="font-semibold text-sm text-primary">{title}</h4>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  </div>
);


export function CreatePostForm({ preselectedCommunityId }: CreatePostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [memberCommunities, setMemberCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: '',
      isDraft: false,
      communityId: preselectedCommunityId || NO_COMMUNITY_VALUE,
    },
  });

  useEffect(() => {
    if (preselectedCommunityId) {
      form.setValue('communityId', preselectedCommunityId);
    }
  }, [preselectedCommunityId, form]);


  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to create a post.");
      router.push('/login?redirect=/posts/create');
    }
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
  }, [authLoading, isAuthenticated, user, router]);


  const handleSuggestCategoryAndTags = useCallback(async () => {
    const contentValue = form.getValues('content');
    if (!contentValue || contentValue.trim().length < 20) {
      toast.error("Content too short. Please write at least 20 characters to get suggestions.");
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await callCategorizeContentAI({ content: contentValue });
      setSuggestedCategory(result.category);
      setSuggestedTags(result.tags);
      toast.success("AI has suggested a category and tags for your post.");
    } catch (error) {
      console.error("Error suggesting category/tags:", error);
      toast.error("Could not get AI suggestions. Please try again.");
    } finally {
      setIsCategorizing(false);
    }
  }, [form]);

  const applySuggestion = (type: 'category' | 'tags') => {
    if (type === 'category' && suggestedCategory) {
      form.setValue('category', suggestedCategory, { shouldValidate: true });
      setSuggestedCategory(null);
    }
    if (type === 'tags' && suggestedTags.length > 0) {
      form.setValue('tags', suggestedTags.join(', '), { shouldValidate: true });
      setSuggestedTags([]);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }], 
      ['link'],
      ['clean']
    ],
  };


  async function onSubmit(data: PostFormValues) {
    if (!user || !user.id) {
      toast.error('Authentication error or user ID is missing. Please log in again.');
      return;
    }
    setIsSubmitting(true);

    const finalData = {
      ...data,
      userId: user.id,
      scheduledAt: (showSchedule && data.scheduledAt) ? data.scheduledAt.toISOString() : undefined,
      communityId: data.communityId === NO_COMMUNITY_VALUE ? undefined : data.communityId,
    };

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.isFlagged) {
           toast.error(result.message || "Post flagged by moderation, please revise.", { duration: 7000 });
        } else {
          if (result.errors) {
            let errorMessages = Object.values(result.errors).flat().join('\n');
            toast.error(`Post creation failed:\n${errorMessages}`, { duration: 6000 });
          } else {
            throw new Error(result.message || `Error: ${response.status}`);
          }
        }
      } else {
        toast.success(`Your post "${result.post?.title || 'Untitled'}" has been successfully created.`);
        form.reset({ content: '', isDraft: false, communityId: preselectedCommunityId || NO_COMMUNITY_VALUE });
        setSuggestedCategory(null);
        setSuggestedTags([]);
        setShowSchedule(false);
        if (finalData.communityId) {
          router.push(`/communities/${finalData.communityId}`);
        } else {
          router.push('/feed');
        }
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
      toast.error(`An unexpected error occurred: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loadingCommunities) {
    return <div className="container mx-auto py-8 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!isAuthenticated && !authLoading) {
    return <div className="container mx-auto py-8 text-center"><p>Redirecting to login...</p></div>;
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
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
            
            <Controller
              name="content"
              control={form.control}
              rules={{ required: "Content is required." }}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <ReactQuill
                      theme="snow"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="Share your thoughts with the community..."
                      modules={quillModules}
                      />
                  </FormControl>
                  <FormDescription>
                    Use the editor above to format your post content.
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
                    <Select onValueChange={field.onChange} value={field.value || NO_COMMUNITY_VALUE} disabled={loadingCommunities}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingCommunities ? "Loading communities..." : "Select a community (optional)"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value={NO_COMMUNITY_VALUE}>None (Post to main feed)</SelectItem>
                        {memberCommunities.map(community => (
                            <SelectItem key={community.id!} value={community.id!}>{community.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>If selected, this post will primarily appear in the chosen community's feed.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}


            <GenAICallout icon={Lightbulb} title="AI Content Assistant">
              Enhance your post with AI! Click to get category & tag suggestions. Content is automatically checked for moderation upon submission.
            </GenAICallout>

            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={handleSuggestCategoryAndTags} disabled={isCategorizing || isSubmitting}>
                {isCategorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Category & Tags
              </Button>
            </div>

            {suggestedCategory && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-md">
                <p className="text-sm font-medium">Suggested Category: <Badge variant="outline" className="bg-background">{suggestedCategory}</Badge></p>
                <Button size="sm" variant="link" onClick={() => applySuggestion('category')} className="p-0 h-auto text-accent hover:text-accent/80">Apply suggestion</Button>
              </div>
            )}

            {suggestedTags.length > 0 && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-md">
                <p className="text-sm font-medium">Suggested Tags: {suggestedTags.map(tag => <Badge key={tag} variant="outline" className="mr-1 mb-1 bg-background">{tag}</Badge>)}</p>
                <Button size="sm" variant="link" onClick={() => applySuggestion('tags')} className="p-0 h-auto text-accent hover:text-accent/80">Apply suggestions</Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                    <Input placeholder="e.g., tech, community, discussion" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated list of tags.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Media (Optional)</FormLabel>
              <FormControl>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-secondary transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-muted-foreground">Images, Videos, Documents (MAX. 10MB)</p>
                    </div>
                    <Input id="dropzone-file" type="file" className="hidden" {...form.register("media")} />
                  </label>
                </div>
              </FormControl>
              <FormDescription>Media upload is a placeholder and not fully implemented with backend storage.</FormDescription>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="isDraft"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Save as Draft</FormLabel>
                    <FormDescription>
                      If checked, this post will not be published immediately.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={(showSchedule && !!form.getValues("scheduledAt")) || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                <FormLabel>Schedule Post (Optional)</FormLabel>
                <FormDescription>
                    Publish this post at a future date and time.
                </FormDescription>
                </div>
                <FormControl>
                <Switch
                    checked={showSchedule}
                    onCheckedChange={(checked) => {
                        setShowSchedule(checked);
                        if (!checked) {
                            form.setValue("scheduledAt", undefined, {shouldValidate: true});
                        }
                        if (checked) {
                            form.setValue("isDraft", false);
                        }
                    }}
                    disabled={isSubmitting}
                />
                </FormControl>
            </FormItem>

            {showSchedule && (
                 <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Scheduled Publishing Time</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                ) : (
                                    <span>Pick a date and time</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                    const newDate = date ? new Date(date) : undefined;
                                    if (newDate && field.value) {
                                        newDate.setHours(field.value.getHours());
                                        newDate.setMinutes(field.value.getMinutes());
                                    } else if (newDate) {
                                        newDate.setHours(9,0,0,0);
                                    }
                                    field.onChange(newDate);
                                    if(newDate) form.setValue("isDraft", false);
                                }}
                                initialFocus
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            />
                            <div className="p-2 border-t">
                                <Input type="time"
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const currentDate = field.value || new Date();
                                        const newDate = new Date(currentDate);
                                        newDate.setHours(hours, minutes);
                                        field.onChange(newDate);
                                        if(newDate) form.setValue("isDraft", false);
                                    }}
                                />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}


            <div className="flex justify-end space-x-2 pt-4">
               <Button type="button" variant="outline" onClick={() => {form.reset({ content: '', isDraft: false, communityId: preselectedCommunityId || NO_COMMUNITY_VALUE }); setShowSchedule(false); setSuggestedCategory(null); setSuggestedTags([]);}} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading} className="btn-gradient min-w-[120px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Submitting...' : (form.getValues('isDraft') ? 'Save Draft' : (showSchedule && form.getValues('scheduledAt') ? 'Schedule Post' : 'Publish Post'))}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    