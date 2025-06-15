
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
import { Loader2, UsersRound, Edit, Sparkles, Calendar as CalendarIcon, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import type { Community, Post, PostMedia } from '@/lib/types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { categorizeContent } from '@/ai/flows/smart-content-categorization';
import NextImage from 'next/image';


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
  isDraft: z.boolean().optional(),
  scheduledAt: z.date().optional().nullable(),
  // status: z.enum(['published', 'draft', 'scheduled']).optional(), // Status derived from isDraft and scheduledAt
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
  const [showSchedule, setShowSchedule] = useState(!!existingPost.scheduledAt && existingPost.status === 'scheduled');

  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const [currentMedia, setCurrentMedia] = useState<PostMedia[]>(existingPost.media || []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<PostEditFormValues>({
    resolver: zodResolver(postEditSchema),
    defaultValues: {
      title: existingPost.title || '',
      content: existingPost.content || '',
      category: existingPost.category || '',
      tags: (Array.isArray(existingPost.tags) ? existingPost.tags.join(', ') : null) || '',
      communityId: existingPost.communityId?.toString() || NO_COMMUNITY_VALUE,
      isDraft: existingPost.status === 'draft',
      scheduledAt: existingPost.scheduledAt && isValid(new Date(existingPost.scheduledAt)) ? new Date(existingPost.scheduledAt) : undefined,
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File is too large. Maximum 5MB allowed.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Invalid file type. Only images are allowed.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleRemoveNewFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRemoveExistingMedia = (index: number) => {
    setCurrentMedia(prev => prev.filter((_, i) => i !== index));
    // Note: This only removes it from the frontend state.
    // Actual deletion from storage would need a backend call if files were stored in cloud.
    // For local /public/uploads, they remain until manually cleaned or post is deleted (if that logic is added).
    toast.info("Media marked for removal. Save changes to apply.");
  };


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

    let finalMedia: PostMedia[] = [...currentMedia];

    if (selectedFile) { // If a new file is selected, upload it
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success) throw new Error(uploadResult.message || 'File upload failed.');
        // Replace existing media if present, or add new
        finalMedia = [{ type: 'image', url: uploadResult.url, name: selectedFile.name }];
      } catch (uploadError) {
        toast.error(uploadError instanceof Error ? uploadError.message : 'Could not upload image.');
        setIsSubmitting(false);
        setIsUploadingFile(false);
        return;
      }
      setIsUploadingFile(false);
    }


    let status = 'published';
    if (data.isDraft) {
      status = 'draft';
    } else if (showSchedule && data.scheduledAt && isValid(new Date(data.scheduledAt))) {
      status = 'scheduled';
    }

    const updatePayload = {
      userId: user.id,
      title: data.title || undefined, 
      content: data.content,
      category: data.category === NO_CATEGORY_SELECTED_VALUE ? null : data.category,
      tags: data.tags, 
      communityId: data.communityId === NO_COMMUNITY_VALUE ? NO_COMMUNITY_VALUE : (data.communityId || null),
      status: status,
      scheduledAt: status === 'scheduled' && data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      media: finalMedia.length > 0 ? finalMedia : null, // Send null to clear media if array is empty
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

  const isPublished = existingPost.status === 'published';


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center"><Edit className="mr-2 h-6 w-6 text-primary"/> Edit Post</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">You are editing: <Link href={`/posts/${existingPost.id}`} className="text-primary hover:underline">{existingPost.title || "Untitled Post"}</Link></p>
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

            <FormItem>
              <FormLabel className="flex items-center">
                <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Current Media
              </FormLabel>
              {currentMedia.length > 0 ? (
                <div className="space-y-2">
                  {currentMedia.map((mediaItem, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                      <NextImage src={mediaItem.url} alt={mediaItem.name || `Media ${index+1}`} width={64} height={64} className="rounded object-cover aspect-square" data-ai-hint="uploaded image"/>
                      <span className="text-sm truncate flex-1">{mediaItem.name || mediaItem.url}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExistingMedia(index)} title="Remove this media">
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No media attached to this post.</p>
              )}
            </FormItem>
            
            <FormItem>
              <FormLabel htmlFor="file-upload-edit" className="flex items-center">
                <UploadCloud className="mr-2 h-4 w-4 text-muted-foreground"/> Replace/Add Image (Optional, max 5MB)
              </FormLabel>
              <Input
                id="file-upload-edit"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="border-dashed border-input hover:border-primary transition-colors"
                disabled={isUploadingFile}
              />
              {isUploadingFile && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
              {filePreview && (
                <div className="mt-2 relative w-full max-w-xs">
                  <NextImage src={filePreview} alt="New image preview" width={200} height={200} className="rounded-md border object-cover aspect-square" data-ai-hint="image preview"/>
                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={handleRemoveNewFile} title="Remove new image">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <FormDescription>Select a new image to replace any existing media, or add one if none exists.</FormDescription>
            </FormItem>


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

            <div className="space-y-4">
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
                <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories} className="w-full sm:w-auto">
                    {isSuggestingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isSuggestingCategories ? 'Getting Suggestions...' : 'AI Suggest Category & Tags'}
                </Button>
                {suggestionError && <p className="text-sm text-destructive">{suggestionError}</p>}
            </div>

            {!isPublished && (
              <>
                <FormField
                  control={form.control}
                  name="isDraft"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Save as Draft</FormLabel>
                        <FormDescription>
                          Keep this post as a draft. It won't be publicly visible.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              setShowSchedule(false); // If saving as draft, uncheck schedule
                              form.setValue("scheduledAt", undefined);
                            }
                          }}
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
                        Set a future date and time for this post to be published. A backend process (not implemented in this prototype) would be needed for automatic publishing.
                    </FormDescription>
                    </div>
                    <FormControl>
                    <Switch
                        checked={showSchedule}
                        onCheckedChange={(checked) => {
                            setShowSchedule(checked);
                            if (!checked) {
                                form.setValue("scheduledAt", undefined);
                            } else {
                                form.setValue("isDraft", false); // If scheduling, it's not a draft
                            }
                        }}
                        disabled={isSubmitting || form.getValues("isDraft")}
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
                                    {field.value && isValid(new Date(field.value)) ? (
                                        format(new Date(field.value), "PPP HH:mm")
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
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                        const newDate = date ? new Date(date) : undefined;
                                        if (newDate && field.value) {
                                            newDate.setHours(new Date(field.value).getHours());
                                            newDate.setMinutes(new Date(field.value).getMinutes());
                                        } else if (newDate) {
                                            newDate.setHours(9,0,0,0);
                                        }
                                        field.onChange(newDate);
                                    }}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                />
                                <div className="p-2 border-t">
                                    <Input type="time"
                                        defaultValue={field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "HH:mm") : "09:00"}
                                        onChange={(e) => {
                                            const time = e.target.value;
                                            const [hours, minutes] = time.split(':').map(Number);
                                            const currentDate = field.value ? new Date(field.value) : new Date();
                                            currentDate.setHours(hours, minutes);
                                            field.onChange(new Date(currentDate));
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
              </>
            )}
            {isPublished && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                    This post is already published. To unpublish or schedule it, you might need to first save it as a draft (if that feature is fully supported by the backend).
                </div>
            )}


            <div className="flex justify-end space-x-2 pt-4">
               <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading || isUploadingFile} className="btn-gradient min-w-[120px]">
                {isSubmitting || isUploadingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingFile? 'Uploading...' : (isSubmitting ? 'Saving...' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

