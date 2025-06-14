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
import { Loader2, UploadCloud, Tags, Lightbulb, Sparkles, ShieldCheck } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createPostAction } from '@/lib/actions/postActions';
import { Checkbox } from '../ui/checkbox';
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

const postFormSchema = z.object({
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(5000, "Content can't exceed 5000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  media: z.any().optional(), // Placeholder for file uploads
  isDraft: z.boolean().default(false),
  scheduledAt: z.date().optional(),
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
      const result = await categorizeContent({ content } as CategorizeContentInput); // Cast to satisfy AI type
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
      form.setValue('category', suggestedCategory);
      setSuggestedCategory(null); // Clear after applying
    }
    if (type === 'tags' && suggestedTags.length > 0) {
      form.setValue('tags', suggestedTags.join(', '));
      setSuggestedTags([]); // Clear after applying
    }
  };


  async function onSubmit(data: PostFormValues) {
    setIsLoading(true);
    setIsModerating(true);

    try {
      // AI Moderation
      const moderationResult = await intelligentContentModeration({ content: data.content, sensitivityLevel: 'medium' } as IntelligentContentModerationInput); // Cast to satisfy AI type
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

      // Proceed with post creation
      const result = await createPostAction(data);
      if (result.success) {
        toast({ title: 'Post Created!', description: 'Your post has been successfully created.' });
        form.reset();
        setSuggestedCategory(null);
        setSuggestedTags([]);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'An unexpected error occurred', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsModerating(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
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
              Click the button below to let AI suggest a category and tags based on your content.
              Your content will also be checked by our AI moderation system upon submission.
            </GenAICallout>

            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={handleSuggestCategoryAndTags} disabled={isCategorizing || isLoading}>
                {isCategorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Category & Tags
              </Button>
            </div>

            {suggestedCategory && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-md">
                <p className="text-sm font-medium">Suggested Category: <Badge variant="outline">{suggestedCategory}</Badge></p>
                <Button size="sm" variant="link" onClick={() => applySuggestion('category')} className="p-0 h-auto text-accent">Apply suggestion</Button>
              </div>
            )}

            {suggestedTags.length > 0 && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-md">
                <p className="text-sm font-medium">Suggested Tags: {suggestedTags.map(tag => <Badge key={tag} variant="outline" className="mr-1">{tag}</Badge>)}</p>
                <Button size="sm" variant="link" onClick={() => applySuggestion('tags')} className="p-0 h-auto text-accent">Apply suggestions</Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
               <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isModerating} className="btn-gradient min-w-[120px]">
                {isLoading || isModerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isModerating ? <ShieldCheck className="mr-2 h-4 w-4" /> : null)}
                {isModerating ? 'Checking...' : (isLoading ? 'Submitting...' : (form.getValues('isDraft') ? 'Save Draft' : 'Publish Post'))}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
