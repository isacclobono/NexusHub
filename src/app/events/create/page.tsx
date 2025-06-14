
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, UploadCloud, Loader2, MapPin, AlertTriangle, UsersRound } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import type { Community } from '@/lib/types';

const eventFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000),
  startTime: z.date({ required_error: "Start date and time are required."}),
  endTime: z.date({ required_error: "End date and time are required."}),
  location: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(), 
  maxAttendees: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  imageUrl: z.string().url({message: "Please enter a valid image URL e.g. https://placehold.co/image.png"}).optional(),
  communityId: z.string().optional(),
}).refine(data => data.endTime > data.startTime, {
  message: "End date and time must be after start date and time.",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function CreateEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [memberCommunities, setMemberCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to create an event.");
      router.push('/login?redirect=/events/create');
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
  

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      category: '',
      tags: '',
      imageUrl: '',
    },
  });

  async function onSubmit(data: EventFormValues) {
    if (!user || !user.id) { 
      toast.error("Authentication error or user ID missing. Please log in again.");
      return;
    }
    setIsSubmitting(true);
    
    const eventDataPayload = {
      ...data,
      organizerId: user.id, 
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      imageUrl: data.imageUrl || `https://placehold.co/1200x400.png?text=${encodeURIComponent(data.title)}`,
      communityId: data.communityId || undefined,
    };

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventDataPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
            let errorMessages = Object.values(result.errors).flat().join('\n');
            toast.error(`Event creation failed:\n${errorMessages}`, { duration: 6000 });
        } else {
            throw new Error(result.message || 'Failed to create event.');
        }
      } else {
        toast.success(`Your event "${result.event.title}" has been successfully created.`);
        form.reset();
        router.push(`/events/${result.event.id}`); 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Event creation failed: ${errorMessage}`);
      console.error("Error creating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loadingCommunities) {
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
        <p className="text-lg text-muted-foreground">Access Denied. Please log in to create events.</p>
        <Button onClick={() => router.push('/login?redirect=/events/create')} className="mt-4">Login</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Tech Meetup" {...field} />
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
                    <FormLabel>Event Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us more about your event..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
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
                    <FormLabel className="flex items-center"><UsersRound className="mr-2 h-4 w-4 text-muted-foreground"/>Associate with a Community (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a community (optional)" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="">None (General event)</SelectItem>
                        {memberCommunities.map(community => (
                            <SelectItem key={community.id!} value={community.id!}>{community.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>If selected, this event will be associated with the chosen community.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date & Time</FormLabel>
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
                            }}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} 
                            initialFocus
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
                                    }}
                                />
                            </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date & Time</FormLabel>
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
                                    newDate.setHours(17,0,0,0); 
                                }
                                field.onChange(newDate);
                            }}
                            disabled={(date) => date < (form.getValues("startTime") || new Date(new Date().setDate(new Date().getDate() -1)))} 
                            initialFocus
                          />
                           <div className="p-2 border-t">
                                <Input type="time" 
                                    defaultValue={field.value ? format(field.value, "HH:mm") : "17:00"}
                                     onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const currentDate = field.value || new Date();
                                        const newDate = new Date(currentDate);
                                        newDate.setHours(hours, minutes);
                                        field.onChange(newDate);
                                    }}
                                />
                            </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., Online or 123 Main St, Anytown" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category for the event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Conference', 'Workshop', 'Meetup', 'Social', 'Webinar', 'Hackathon', 'Networking', 'Product Launch', 'Community Building', 'Other'].map(cat => (
                          <SelectItem key={cat} value={cat.toLowerCase().replace(/\s+/g, '-')}>{cat}</SelectItem>
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
                      <Input placeholder="e.g., AI, WebDev, Networking" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of tags.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAttendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attendees (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Image URL (Optional)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="https://example.com/your-event-image.png" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                     <FormDescription>Link to an image for your event (e.g., from placehold.co or Unsplash).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="p-0 pt-8">
                <Button type="submit" disabled={isSubmitting || authLoading} className="w-full md:w-auto btn-gradient">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Event
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
