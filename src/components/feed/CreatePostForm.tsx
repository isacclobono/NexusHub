
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, UploadCloud, Sparkles, ShieldCheck, Lightbulb } from 'lucide-react'; // Added Lightbulb
import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPostAction } from '@/lib/actions/postActions';
import { CATEGORIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const postFormSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(5000, "Content can't exceed 5000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(), 
  media: z.any().optional(), 
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
}).refine(data => !data.scheduledAt || data.scheduledAt > new Date(), {
    message: "Scheduled date must be in the future.",
    path: ["scheduledAt"],
});

type PostFormValues = z.infer<typeof postFormSchema>;

const GenAICallout = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
  <div className="mt-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex">
    <Icon className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-1" />
    <div>
      <h4 className="font-semibold text-sm text-primary">{title}</h4>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  </div>
);


export function CreatePostForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const { toast } = useToast();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: '',
      isDraft: false,
    },
  });

  const handleSuggestCategoryAndTags = useCallback(async () => {
    const content = form.getValues('content');
    if (!content || content.trim().length < 20) {
      toast({ title: "Content too short", description: "Please write at least 20 characters to get suggestions.", variant: "destructive" });
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await categorizeContent({ content });
      setSuggestedCategory(result.category);
      setSuggestedTags(result.tags);
      toast({ title: "Suggestions Ready!", description: "AI has suggested a category and tags for your post." });
    } catch (error) {
      console.error("Error suggesting category/tags:", error);
      toast({ title: "Suggestion Failed", description: "Could not get AI suggestions. Please try again.", variant: "destructive" });
    } finally {
      setIsCategorizing(false);
    }
  }, [form, toast]);

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


  async function onSubmit(data: PostFormValues) {
    setIsLoading(true);
    setIsModerating(true);

    try {
      const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
      const moderationResult = await intelligentContentModeration(moderationInput);
      setIsModerating(false);

      if (moderationResult.isFlagged) {
        toast({
          title: "Content Moderation Alert",
          description: `Your post has been flagged: ${moderationResult.reason}. Please revise your content.`,
          variant: "destructive",
          duration: 7000,
        });
        setIsLoading(false);
        return;
      }

      // If scheduling is shown but no date is set, clear it before submitting
      const finalData = { ...data };
      if (!showSchedule || !finalData.scheduledAt) {
        finalData.scheduledAt = undefined;
      }
      
      const result = await createPostAction(finalData);
      if (result.success) {
        toast({ title: 'Post Action Successful!', description: `Your post "${result.post?.title || 'Untitled'}" has been processed.` });
        form.reset();
        setSuggestedCategory(null);
        setSuggestedTags([]);
        setShowSchedule(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
      toast({ title: 'An unexpected error occurred', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsModerating(false);
    }
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
                    <Textarea
                      placeholder="Share your thoughts with the community..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <GenAICallout icon={Lightbulb} title="AI Content Assistant">
              Enhance your post with AI! Click to get category & tag suggestions. Content is automatically checked for moderation.
            </GenAICallout>

            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={handleSuggestCategoryAndTags} disabled={isCategorizing || isLoading || isModerating}>
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
                      disabled={showSchedule && !!form.getValues("scheduledAt")}
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
                        if (checked) { // If scheduling, ensure it's not a draft
                            form.setValue("isDraft", false);
                        }
                    }}
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
                                    field.onChange(date);
                                    if(date) form.setValue("isDraft", false); // Cannot be draft if scheduled
                                }}
                                initialFocus
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                            />
                            {/* Basic Time Picker (conceptual) - would need a proper time picker component for full functionality */}
                            <div className="p-2 border-t">
                                <Input type="time" 
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const currentDate = field.value || new Date();
                                        currentDate.setHours(hours, minutes);
                                        field.onChange(new Date(currentDate));
                                        if(field.value) form.setValue("isDraft", false);
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
               <Button type="button" variant="outline" onClick={() => {form.reset(); setShowSchedule(false);}} disabled={isLoading || isModerating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isModerating} className="btn-gradient min-w-[120px]">
                {isModerating ? <ShieldCheck className="mr-2 h-4 w-4 animate-pulse" /> : (isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null)}
                {isModerating ? 'Checking...' : (isLoading ? 'Submitting...' : (form.getValues('isDraft') ? 'Save Draft' : (form.getValues('scheduledAt') ? 'Schedule Post' : 'Publish Post')))}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
