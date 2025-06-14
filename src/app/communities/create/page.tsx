
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, AlertTriangle, UsersRound, UploadCloud } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COMMUNITY_PRIVACY_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';

const communityFormSchema = z.object({
  name: z.string().min(3, 'Community name must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(1000),
  privacy: z.enum(['public', 'private'], { required_error: "Please select a privacy option." }),
  coverImageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
});

type CommunityFormValues = z.infer<typeof communityFormSchema>;

export default function CreateCommunityPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to create a community.");
      router.push('/login?redirect=/communities/create');
    }
  }, [authLoading, isAuthenticated, router]);
  

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      name: '',
      description: '',
      privacy: 'public',
      coverImageUrl: '',
    },
  });

  async function onSubmit(data: CommunityFormValues) {
    if (!user || !user.id) {
      toast.error("Authentication error or user ID missing. Please log in again.");
      return;
    }
    setIsSubmitting(true);
    
    const communityDataPayload = {
      ...data,
      creatorId: user.id,
      coverImageUrl: data.coverImageUrl || `https://placehold.co/1200x300.png?text=${encodeURIComponent(data.name)}`,
    };

    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(communityDataPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
            let errorMessages = Object.values(result.errors).flat().join('\n');
            toast.error(`Community creation failed:\n${errorMessages}`, { duration: 6000 });
        } else {
            throw new Error(result.message || 'Failed to create community.');
        }
      } else {
        toast.success(`Community "${result.community.name}" created successfully!`);
        form.reset();
        router.push(`/communities/${result.community.id}`); 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Community creation failed: ${errorMessage}`);
      console.error("Error creating community:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated && !authLoading) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-muted-foreground">Access Denied. Please log in to create communities.</p>
        <Button onClick={() => router.push('/login?redirect=/communities/create')} className="mt-4">Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <UsersRound className="mr-3 h-7 w-7 text-primary" /> Create New Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AI Innovators Hub" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is this community about?"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Privacy Settings</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        {COMMUNITY_PRIVACY_OPTIONS.map(option => (
                          <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={option.value} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL (Optional)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="https://example.com/your-cover-image.png" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                     <FormDescription>Link to an image for your community's banner (e.g., from placehold.co or Unsplash).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="p-0 pt-8">
                <Button type="submit" disabled={isSubmitting || authLoading} className="w-full md:w-auto btn-gradient">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Community
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
