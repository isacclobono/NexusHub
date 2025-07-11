
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
import { Loader2, UsersRound, Edit, Sparkles, Calendar as CalendarIcon, UploadCloud, Image as ImageIconLucide, FileText, Video as VideoIcon, Trash2, X, ListChecks } from 'lucide-react';
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
const MAX_FILES_EDIT = 5;
const MAX_FILE_SIZE_MB_EDIT = 10;

const ACCEPTED_IMAGE_TYPES_EDIT = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_VIDEO_TYPES_EDIT = ['video/mp4', 'video/webm', 'video/ogg'];
const ACCEPTED_DOCUMENT_TYPES_EDIT = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'];
const ALL_ACCEPTED_TYPES_STRING_EDIT = [...ACCEPTED_IMAGE_TYPES_EDIT, ...ACCEPTED_VIDEO_TYPES_EDIT, ...ACCEPTED_DOCUMENT_TYPES_EDIT].join(',');


const postEditSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(50000, "Content can't exceed 50000 characters."),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  communityId: z.string().optional().nullable(),
  isDraft: z.boolean().optional(),
  scheduledAt: z.date().optional().nullable(),
  postType: z.enum(['standard', 'poll', 'question']).default('standard').optional(), // Added postType
  // pollOptions are not directly editable in this form for simplicity in this iteration
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
  const [showSchedule, setShowSchedule] = useState(false);

  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  const [currentMedia, setCurrentMedia] = useState<PostMedia[]>(existingPost.media || []);
  const [newlySelectedFiles, setNewlySelectedFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<{ url: string; type: 'image' | 'video' | 'document'; name: string }[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<PostEditFormValues>({
    resolver: zodResolver(postEditSchema),
  });

  useEffect(() => {
    if (existingPost) {
        form.reset({
            title: existingPost.title || '',
            content: existingPost.content || '',
            category: existingPost.category || NO_CATEGORY_SELECTED_VALUE,
            tags: (Array.isArray(existingPost.tags) ? existingPost.tags.join(', ') : null) || '',
            communityId: existingPost.communityId?.toString() || NO_COMMUNITY_VALUE,
            isDraft: existingPost.status === 'draft',
            scheduledAt: existingPost.scheduledAt && isValid(new Date(existingPost.scheduledAt)) ? new Date(existingPost.scheduledAt) : undefined,
            postType: existingPost.postType || 'standard',
        });
        setCurrentMedia(existingPost.media || []);
        setShowSchedule(!!existingPost.scheduledAt && existingPost.status === 'scheduled');
    }
  }, [existingPost, form]);


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

  const getFileType = (file: File): 'image' | 'video' | 'document' | 'other' => {
    if (ACCEPTED_IMAGE_TYPES_EDIT.includes(file.type)) return 'image';
    if (ACCEPTED_VIDEO_TYPES_EDIT.includes(file.type)) return 'video';
    if (ACCEPTED_DOCUMENT_TYPES_EDIT.includes(file.type)) return 'document';
    return 'other';
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesArray = Array.from(files);
      const currentTotalFiles = currentMedia.length + newlySelectedFiles.length;
      
      if (currentTotalFiles + newFilesArray.length > MAX_FILES_EDIT) {
        toast.error(`You can upload a maximum of ${MAX_FILES_EDIT} files in total.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const validNewFiles: File[] = [];
      const newLocalPreviews: { url: string; type: 'image' | 'video' | 'document'; name: string }[] = [];

      for (const file of newFilesArray) {
        if (file.size > MAX_FILE_SIZE_MB_EDIT * 1024 * 1024) {
          toast.error(`File "${file.name}" is too large. Max ${MAX_FILE_SIZE_MB_EDIT}MB allowed.`);
          continue;
        }
        const fileType = getFileType(file);
        if (fileType === 'other') {
          toast.error(`File "${file.name}" is not a valid image, video, or document type.`);
          continue;
        }
        validNewFiles.push(file);
        newLocalPreviews.push({ url: URL.createObjectURL(file), type: fileType, name: file.name });
      }

      setNewlySelectedFiles(prev => [...prev, ...validNewFiles]);
      setNewFilePreviews(prev => [...prev, ...newLocalPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveExistingMedia = (indexToRemove: number) => {
    setCurrentMedia(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    URL.revokeObjectURL(newFilePreviews[indexToRemove].url);
    setNewlySelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setNewFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
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
    let uploadedNewMediaItems: PostMedia[] = [];

    if (newlySelectedFiles.length > 0) {
      setIsUploadingFiles(true);
      toast.loading(`Uploading ${newlySelectedFiles.length} new file(s)...`, { id: 'edit-upload-toast' });
      
      for (let i = 0; i < newlySelectedFiles.length; i++) {
        const file = newlySelectedFiles[i];
        const previewInfo = newFilePreviews[i];
        const formData = new FormData();
        formData.append('file', file);
        try {
          const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
          const uploadResult = await uploadResponse.json();
          if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.message || `Failed to upload ${file.name}.`);
          }
          uploadedNewMediaItems.push({ type: previewInfo.type, url: uploadResult.url, name: file.name });
        } catch (uploadError) {
          toast.dismiss('edit-upload-toast');
          toast.error(uploadError instanceof Error ? uploadError.message : `Could not upload ${file.name}.`);
          setIsSubmitting(false);
          setIsUploadingFiles(false);
          return;
        }
      }
      toast.dismiss('edit-upload-toast');
      toast.success(`${uploadedNewMediaItems.length} new file(s) uploaded successfully!`);
      setIsUploadingFiles(false);
    }

    const finalMediaPayload = [...currentMedia, ...uploadedNewMediaItems];
    
    let statusToSet = existingPost.status || 'published';
    if (existingPost.status !== 'published') {
        if (data.isDraft) {
            statusToSet = 'draft';
        } else if (showSchedule && data.scheduledAt && isValid(new Date(data.scheduledAt))) {
            statusToSet = 'scheduled';
        } else if (existingPost.status === 'draft' && !data.isDraft && !(showSchedule && data.scheduledAt)) {
            statusToSet = 'published';
        }
    }


    const updatePayload = {
      userId: user.id,
      title: data.title || undefined, 
      content: data.content,
      category: data.category === NO_CATEGORY_SELECTED_VALUE ? null : data.category,
      tags: data.tags, 
      communityId: data.communityId === NO_COMMUNITY_VALUE ? NO_COMMUNITY_VALUE : (data.communityId || null),
      status: statusToSet,
      scheduledAt: statusToSet === 'scheduled' && data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      media: finalMediaPayload.length > 0 ? finalMediaPayload : null,
      // postType is not editable after creation for simplicity in this iteration
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
  const isPoll = existingPost.postType === 'poll';


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center"><Edit className="mr-2 h-6 w-6 text-primary"/> Edit {isPoll ? 'Poll' : 'Post'}</CardTitle>
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
                  <FormLabel>{isPoll ? 'Poll Question' : 'Title (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder={isPoll ? 'Your poll question...' : 'Your amazing post title'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isPoll && ( // Content field only for non-poll posts
              <Controller
                name="content"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                          <DynamicQuillEditor
                              key={existingPost.id} 
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
            )}
             {isPoll && existingPost.pollOptions && (
              <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                <FormLabel className="text-md font-medium">Poll Options (Cannot be edited after creation)</FormLabel>
                {existingPost.pollOptions.map((option, index) => (
                  <div key={option.id || option._id?.toString()} className="p-2 border-b text-sm text-muted-foreground">
                    {index + 1}. {option.optionText}
                  </div>
                ))}
                 <FormDescription>Poll options cannot be changed once the poll is created to maintain integrity of votes.</FormDescription>
              </div>
            )}


            <FormItem>
              <FormLabel className="flex items-center">
                <ImageIconLucide className="mr-2 h-4 w-4 text-muted-foreground"/> Current Media ({currentMedia.length}/{MAX_FILES_EDIT})
              </FormLabel>
              {currentMedia.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {currentMedia.map((mediaItem, index) => (
                    <div key={index} className="relative group aspect-square border rounded-md flex flex-col items-center justify-center p-1">
                      {mediaItem.type === 'image' && (
                        <NextImage src={mediaItem.url} alt={mediaItem.name || `Media ${index+1}`} layout="fill" className="rounded-md object-cover" data-ai-hint="user image post"/>
                      )}
                      {mediaItem.type === 'video' && (
                        <div className="text-center">
                           <VideoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                           <p className="text-xs text-muted-foreground truncate w-full" title={mediaItem.name}>{mediaItem.name}</p>
                        </div>
                      )}
                       {mediaItem.type === 'document' && (
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                           <p className="text-xs text-muted-foreground truncate w-full" title={mediaItem.name}>{mediaItem.name}</p>
                        </div>
                      )}
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveExistingMedia(index)} title="Remove this media">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No media currently attached.</p>
              )}
            </FormItem>
            
            <FormItem>
              <FormLabel htmlFor="file-upload-edit" className="flex items-center">
                <UploadCloud className="mr-2 h-4 w-4 text-muted-foreground"/> Add New Media ({newlySelectedFiles.length} selected, {MAX_FILES_EDIT - currentMedia.length - newlySelectedFiles.length} remaining)
              </FormLabel>
              <Input
                id="file-upload-edit"
                type="file"
                accept={ALL_ACCEPTED_TYPES_STRING_EDIT}
                multiple
                onChange={handleFileChange}
                ref={fileInputRef}
                className="border-dashed border-input hover:border-primary transition-colors"
                disabled={isUploadingFiles || (currentMedia.length + newlySelectedFiles.length >= MAX_FILES_EDIT)}
              />
              {isUploadingFiles && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading new files...
                </div>
              )}
              {newFilePreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {newFilePreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square border rounded-md flex flex-col items-center justify-center p-1">
                       {preview.type === 'image' && (
                        <NextImage src={preview.url} alt={`New file ${index + 1} preview`} layout="fill" className="rounded-md object-cover" data-ai-hint="image preview edit"/>
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
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveNewFile(index)} title="Remove new file">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <FormDescription>Add new images, videos, or documents. Max {MAX_FILES_EDIT} total files.</FormDescription>
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
                <Button type="button" variant="outline" onClick={handleSuggestCategories} disabled={isSuggestingCategories || isPoll} className="w-full sm:w-auto">
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
                              setShowSchedule(false); 
                              form.setValue("scheduledAt", undefined, { shouldValidate: true });
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
                        Set a future date and time for this post to be published.
                    </FormDescription>
                    </div>
                    <FormControl>
                    <Switch
                        checked={showSchedule}
                        onCheckedChange={(checked) => {
                            setShowSchedule(checked);
                            if (!checked) { 
                                form.setValue("scheduledAt", undefined, { shouldValidate: true });
                            } else { 
                                form.setValue("isDraft", false, { shouldValidate: true }); 
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
                                        if (newDate && field.value && isValid(new Date(field.value))) {
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
                                        value={field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "HH:mm") : "09:00"}
                                        onChange={(e) => {
                                            const time = e.target.value;
                                            const [hours, minutes] = time.split(':').map(Number);
                                            const currentDate = field.value && isValid(new Date(field.value)) ? new Date(field.value) : new Date();
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
                    This post is already published. To unpublish or change its schedule, you would typically need a different action (not available in this basic edit form).
                </div>
            )}


            <div className="flex justify-end space-x-2 pt-4">
               <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || authLoading || isUploadingFiles} className="btn-gradient min-w-[120px]">
                {isUploadingFiles || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploadingFiles? 'Uploading...' : (isSubmitting ? 'Saving...' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
