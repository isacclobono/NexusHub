
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar as CalendarIcon, UsersRound, Sparkles, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CATEGORIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import type { Community, PostMedia } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { categorizeContent } from '@/ai/flows/smart-content-categorization';
import NextImage from 'next/image'; // Renamed to avoid conflict with ImageIcon

const DynamicQuillEditor = dynamic(() => import('@/components/editor/QuillEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full rounded-md border border-input" />,
});


const NO_COMMUNITY_VALUE = "__NONE__";

const postFormSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(50000, "Content can't exceed 50000 characters."),
  category: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
  communityId: z.string().optional(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface CreatePostFormProps {
  preselectedCommunityId?: string;
}

export function CreatePostForm({ preselectedCommunityId }: CreatePostFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [memberCommunities, setMemberCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      tags: '',
      isDraft: false,
      communityId: preselectedCommunityId || NO_COMMUNITY_VALUE,
      scheduledAt: undefined,
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File is too large. Maximum 5MB allowed.");
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Invalid file type. Only images are allowed.");
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input
    }
  };


  const handleSuggestCategories = async () => {
    const contentValue = form.getValues('content');
    if (!contentValue || contentValue.trim() === "<p><br></p>" || contentValue.trim().length < 20) {
      toast.error("Please write some content before suggesting categories.");
      return;
    }

    setIsSuggestingCategories(true);
    setSuggestionError(null);
    try {
      const result = await categorizeContent({ content: contentValue });
      if (result.category) {
        form.setValue('category', result.category, { shouldValidate: true });
      }
      if (result.tags && result.tags.length > 0) {
        form.setValue('tags', result.tags.join(', '), { shouldValidate: true });
      }
      toast.success("AI suggestions applied!");
    } catch (error) {
      console.error("AI suggestion error:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not get AI suggestions.";
      setSuggestionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  async function onSubmit(data: PostFormValues) {
    if (!user || !user.id) {
      toast.error('Authentication error or user ID is missing. Please log in again.');
      return;
    }
    setIsSubmitting(true);
    let uploadedMedia: PostMedia[] = [];

    if (selectedFile) {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(uploadResult.message || 'File upload failed.');
        }
        uploadedMedia.push({ type: 'image', url: uploadResult.url, name: selectedFile.name });
      } catch (uploadError) {
        toast.error(uploadError instanceof Error ? uploadError.message : 'Could not upload image.');
        setIsSubmitting(false);
        setIsUploadingFile(false);
        return;
      }
      setIsUploadingFile(false);
    }

    const finalData = {
      ...data,
      userId: user.id,
      scheduledAt: (showSchedule && data.scheduledAt) ? data.scheduledAt.toISOString() : undefined,
      communityId: data.communityId === NO_COMMUNITY_VALUE ? undefined : data.communityId,
      media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
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
        form.reset({ title: '', content: '', isDraft: false, category: '', tags: '', communityId: preselectedCommunityId || NO_COMMUNITY_VALUE, scheduledAt: undefined });
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel htmlFor="file-upload" className="flex items-center">
                <UploadCloud className="mr-2 h-4 w-4 text-muted-foreground"/> Add Image (Optional, max 5MB)
              </FormLabel>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="border-dashed border-input hover:border-primary transition-colors"
                disabled={isUploadingFile}
              />
              {isUploadingFile && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
              {filePreview && (
                <div className="mt-2 relative w-full max-w-xs">
                  <NextImage src={filePreview} alt="Selected image preview" width={200} height={200} className="rounded-md border object-cover aspect-square" data-ai-hint="user image upload"/>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={handleRemoveFile}
                    title="Remove image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <FormDescription>Attach an image to your post.</FormDescription>
            </FormItem>


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

            <div className="space-y-4">
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
                <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories} className="w-full sm:w-auto">
                    {isSuggestingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isSuggestingCategories ? 'Getting Suggestions...' : 'AI Suggest Category & Tags'}
                </Button>
                {suggestionError && <p className="text-sm text-destructive">{suggestionError}</p>}
            </div>

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
               <Button type="button" variant="outline" onClick={() => {
                  form.reset({ title: '', content: '', isDraft: false, category: '', tags: '', communityId: preselectedCommunityId || NO_COMMUNITY_VALUE, scheduledAt: undefined });
                  setSelectedFile(null);
                  setFilePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  setShowSchedule(false);
                }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading || isUploadingFile} className="btn-gradient min-w-[120px]">
                {isSubmitting || isUploadingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingFile ? 'Uploading...' : (isSubmitting ? 'Submitting...' : (form.getValues('isDraft') ? 'Save Draft' : (showSchedule && form.getValues('scheduledAt') ? 'Schedule Post' : 'Publish Post')))}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
