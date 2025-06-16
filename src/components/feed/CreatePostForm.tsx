
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
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
import { Loader2, Calendar as CalendarIcon, UsersRound, Sparkles, UploadCloud, Image as ImageIcon, FileText, Video as VideoIcon, Trash2, X, ListChecks, PlusCircle } from 'lucide-react';
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
import type { Community, PostMedia, PollOption } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { categorizeContent } from '@/ai/flows/smart-content-categorization';
import NextImage from 'next/image';
import { ObjectId } from 'mongodb';


const DynamicQuillEditor = dynamic(() => import('@/components/editor/QuillEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full rounded-md border border-input" />,
});


const NO_COMMUNITY_VALUE = "__NONE__";
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'];
const ALL_ACCEPTED_TYPES_STRING = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_DOCUMENT_TYPES].join(',');


const pollOptionSchema = z.object({
  optionText: z.string().min(1, "Option text cannot be empty.").max(100, "Option text too long."),
});

const postFormSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(50000, "Content can't exceed 50000 characters."),
  category: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
  communityId: z.string().optional(),
  postType: z.enum(['standard', 'poll', 'question']).default('standard'),
  pollOptions: z.array(pollOptionSchema).optional().refine(options => {
    // If postType is poll, require at least 2 options
    if (options && options.length > 0 && options.length < 2) return false;
    return true;
  }, { message: "Polls must have at least 2 options." }),
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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video' | 'document'; name: string }[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
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
      postType: 'standard',
      pollOptions: [{ optionText: '' }, { optionText: '' }], // Start with 2 empty options for polls
    },
  });

  const { fields: pollOptionFields, append: appendPollOption, remove: removePollOption } = useFieldArray({
    control: form.control,
    name: "pollOptions",
  });

  const watchPostType = form.watch('postType');

  useEffect(() => {
    if (watchPostType !== 'poll' && pollOptionFields.length > 0) {
      // form.setValue('pollOptions', []); // Clear options if not a poll
    } else if (watchPostType === 'poll' && pollOptionFields.length === 0) {
      form.setValue('pollOptions', [{ optionText: '' }, { optionText: '' }]);
    }
  }, [watchPostType, pollOptionFields.length, form]);


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

  const getFileType = (file: File): 'image' | 'video' | 'document' | 'other' => {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'image';
    if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'video';
    if (ACCEPTED_DOCUMENT_TYPES.includes(file.type)) return 'document';
    return 'other';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const currentFileCount = selectedFiles.length;
      if (currentFileCount + newFiles.length > MAX_FILES) {
        toast.error(`You can upload a maximum of ${MAX_FILES} files.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const validFiles: File[] = [];
      const newPreviews: { url: string; type: 'image' | 'video' | 'document'; name: string }[] = [];

      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast.error(`File "${file.name}" is too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`);
          continue;
        }
        const fileType = getFileType(file);
        if (fileType === 'other') {
          toast.error(`File "${file.name}" is not a valid image, video, or document type.`);
          continue;
        }
        validFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: fileType, name: file.name });
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
      setFilePreviews(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index].url);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
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
    if (data.postType === 'poll' && (!data.pollOptions || data.pollOptions.length < 2 || data.pollOptions.some(opt => !opt.optionText.trim()))){
      form.setError("pollOptions", { type: "manual", message: "Polls must have at least two options, and each option must have text."});
      toast.error("Please ensure all poll options are filled and there are at least two.");
      return;
    }

    setIsSubmitting(true);
    let uploadedMedia: PostMedia[] = [];

    if (selectedFiles.length > 0) {
      setIsUploadingFiles(true);
      toast.loading(`Uploading ${selectedFiles.length} file(s)...`, { id: 'upload-toast' });
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const previewInfo = filePreviews[i];
        const formData = new FormData();
        formData.append('file', file);
        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const uploadResult = await uploadResponse.json();
          if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.message || `Failed to upload ${file.name}.`);
          }
          uploadedMedia.push({ type: previewInfo.type, url: uploadResult.url, name: file.name });
        } catch (uploadError) {
          toast.dismiss('upload-toast');
          toast.error(uploadError instanceof Error ? uploadError.message : `Could not upload ${file.name}.`);
          setIsSubmitting(false);
          setIsUploadingFiles(false);
          return;
        }
      }
      toast.dismiss('upload-toast');
      toast.success(`${uploadedMedia.length} file(s) uploaded successfully!`);
      setIsUploadingFiles(false);
    }

    const finalData = {
      ...data,
      userId: user.id,
      scheduledAt: (showSchedule && data.scheduledAt) ? data.scheduledAt.toISOString() : undefined,
      communityId: data.communityId === NO_COMMUNITY_VALUE ? undefined : data.communityId,
      media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      pollOptions: data.postType === 'poll' ? data.pollOptions?.map(opt => ({ ...opt, votes: 0, votedBy: [] as ObjectId[] })) : undefined,
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
            let errorMessages = Object.entries(result.errors).map(([key, value]) => {
              if (key === 'pollOptions' && Array.isArray(value)) { // Handle nested errors for pollOptions
                return (value as any[]).map((err, index) => err && err.optionText ? `Poll Option ${index + 1}: ${err.optionText._errors.join(', ')}` : `Poll Option ${index + 1}: Invalid`).join('\n');
              }
              return `${key}: ${(value as any)._errors.join(', ')}`;
            }).join('\n');
            toast.error(`Post creation failed:\n${errorMessages}`, { duration: 6000 });
          } else {
            throw new Error(result.message || `Error: ${response.status}`);
          }
        }
      } else {
        toast.success(`Your post "${result.post?.title || 'Untitled'}" has been successfully created.`);
        form.reset({ title: '', content: '', isDraft: false, category: '', tags: '', communityId: preselectedCommunityId || NO_COMMUNITY_VALUE, scheduledAt: undefined, postType: 'standard', pollOptions: [{ optionText: '' }, { optionText: '' }] });
        setSelectedFiles([]);
        setFilePreviews([]);
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
              name="postType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select post type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard Post</SelectItem>
                      <SelectItem value="poll">Poll</SelectItem>
                      {/* <SelectItem value="question">Question (Q&A)</SelectItem> */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{watchPostType === 'poll' ? 'Poll Question' : 'Title (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder={watchPostType === 'poll' ? 'What do you want to ask?' : 'Your amazing post title'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchPostType === 'poll' && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <FormLabel>Poll Options</FormLabel>
                {pollOptionFields.map((item, index) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name={`pollOptions.${index}.optionText`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input placeholder={`Option ${index + 1}`} {...field} />
                          </FormControl>
                          {pollOptionFields.length > 2 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(index)} title="Remove option">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                {pollOptionFields.length < 10 && ( // Max 10 options for a poll
                  <Button type="button" variant="outline" size="sm" onClick={() => appendPollOption({ optionText: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                )}
                 {form.formState.errors.pollOptions?.message && <FormMessage>{form.formState.errors.pollOptions.message}</FormMessage>}

              </div>
            )}
            
            {watchPostType !== 'poll' && (
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
            )}


            <FormItem>
              <FormLabel htmlFor="file-upload" className="flex items-center">
                <UploadCloud className="mr-2 h-4 w-4 text-muted-foreground"/> Add Media (Optional, max {MAX_FILES}, {MAX_FILE_SIZE_MB}MB each)
              </FormLabel>
              <Input
                id="file-upload"
                type="file"
                accept={ALL_ACCEPTED_TYPES_STRING}
                multiple 
                onChange={handleFileChange}
                ref={fileInputRef}
                className="border-dashed border-input hover:border-primary transition-colors"
                disabled={isUploadingFiles || selectedFiles.length >= MAX_FILES}
              />
              {isUploadingFiles && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading files...
                </div>
              )}
              {filePreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filePreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square border rounded-md flex flex-col items-center justify-center p-2">
                      {preview.type === 'image' && (
                        <NextImage src={preview.url} alt={`Selected file ${index + 1} preview`} layout="fill" className="rounded-md object-cover" data-ai-hint="user image upload small"/>
                      )}
                      {preview.type === 'video' && (
                        <div className="text-center">
                          <VideoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground truncate w-full" title={preview.name}>{preview.name}</p>
                        </div>
                      )}
                       {preview.type === 'document' && (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                           <p className="text-xs text-muted-foreground truncate w-full" title={preview.name}>{preview.name}</p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(index)}
                        title="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <FormDescription>Attach up to {MAX_FILES} images, videos, or documents.</FormDescription>
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
                                    value={field.value ? format(field.value, "HH:mm") : "09:00"}
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
                  form.reset({ title: '', content: '', isDraft: false, category: '', tags: '', communityId: preselectedCommunityId || NO_COMMUNITY_VALUE, scheduledAt: undefined, postType: 'standard', pollOptions: [{ optionText: '' }, { optionText: '' }] });
                  setSelectedFiles([]);
                  setFilePreviews([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  setShowSchedule(false);
                }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading || isUploadingFiles} className="btn-gradient min-w-[120px]">
                {isUploadingFiles || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingFiles ? 'Uploading...' : (isSubmitting ? 'Submitting...' : (form.getValues('isDraft') ? 'Save Draft' : (showSchedule && form.getValues('scheduledAt') ? 'Schedule Post' : 'Publish Post')))}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
