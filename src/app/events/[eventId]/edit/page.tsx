
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
import { Calendar as CalendarIcon, UploadCloud, Loader2, MapPin, AlertTriangle, UsersRound, DollarSign, Edit, ArrowLeft } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter, useParams } from 'next/navigation';
import type { Community, Event as EventType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const NO_COMMUNITY_VALUE = "__NONE__"; 

const eventEditSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000),
  startTime: z.date({ required_error: "Start date and time are required."}),
  endTime: z.date({ required_error: "End date and time are required."}),
  location: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(), 
  maxAttendees: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  imageUrl: z.string().url({message: "Please enter a valid image URL e.g. https://placehold.co/image.png"}).optional().nullable().or(z.literal('')),
  communityId: z.string().optional().nullable(),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().nonnegative("Price must be a positive number or zero.").optional().nullable()
  ),
  currency: z.string().max(5, "Currency code too long.").optional().nullable(),
}).refine(data => data.endTime > data.startTime, {
  message: "End date and time must be after start date and time.",
  path: ["endTime"],
});

type EventEditFormValues = z.infer<typeof eventEditSchema>;

const EditEventSkeleton = () => (
  <div className="container mx-auto py-8">
    <Skeleton className="h-10 w-48 mb-6" />
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  </div>
);

export default function EditEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [memberCommunities, setMemberCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  

  const form = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      category: '',
      tags: '',
      imageUrl: '',
      communityId: NO_COMMUNITY_VALUE,
      price: undefined,
      currency: 'USD',
    },
  });

  const fetchEventAndUserCommunities = useCallback(async () => {
    if (!eventId || !user?.id) return;

    setLoadingEvent(true);
    setLoadingCommunities(true);
    setPageError(null);

    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (!eventResponse.ok) {
        const errorData = await eventResponse.json();
        throw new Error(errorData.message || 'Failed to fetch event details.');
      }
      const eventData: EventType = await eventResponse.json();
      
      if (eventData.organizerId.toString() !== user.id.toString()) {
        toast.error("You are not authorized to edit this event.");
        router.push(`/events/${eventId}`);
        throw new Error("Unauthorized");
      }
      setEvent(eventData);
      form.reset({
        title: eventData.title,
        description: eventData.description,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        location: eventData.location || '',
        category: eventData.category || '',
        tags: Array.isArray(eventData.tags) ? eventData.tags.join(', ') : '',
        maxAttendees: eventData.maxAttendees,
        imageUrl: eventData.imageUrl || '',
        communityId: eventData.communityId?.toString() || NO_COMMUNITY_VALUE,
        price: eventData.price,
        currency: eventData.currency || 'USD',
      });
      setLoadingEvent(false);

      // Fetch user's communities
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
      console.error("Error fetching data for edit page:", error);
      if (!(error instanceof Error && error.message === "Unauthorized")) {
        setPageError(error instanceof Error ? error.message : "Could not load data for editing.");
      }
    } finally {
      setLoadingEvent(false);
      setLoadingCommunities(false);
    }
  }, [eventId, user?.id, form, router]);


  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to edit an event.");
      router.push(`/login?redirect=/events/${eventId}/edit`);
    }
    if (isAuthenticated && user?.id && eventId) {
      fetchEventAndUserCommunities();
    }
  }, [authLoading, isAuthenticated, user, eventId, router, fetchEventAndUserCommunities]);
  

  async function onSubmit(data: EventEditFormValues) {
    if (!user || !user.id || !event || !event.id) { 
      toast.error("Authentication error or event data missing.");
      return;
    }
    if (event.organizerId.toString() !== user.id.toString()) {
        toast.error("You are not authorized to perform this action.");
        return;
    }
    setIsSubmitting(true);
    
    const eventDataPayload = {
      ...data,
      userId: user.id, // For authorization on backend
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      imageUrl: data.imageUrl || `https://placehold.co/1200x400.png?text=${encodeURIComponent(data.title)}`,
      communityId: data.communityId === NO_COMMUNITY_VALUE ? null : data.communityId,
      tags: data.tags || null, // Ensure tags are null if empty string
      location: data.location || null,
      category: data.category || null,
      price: data.price === undefined || data.price === null ? null : Number(data.price),
      currency: data.price && data.price > 0 ? (data.currency || 'USD') : null,
    };

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventDataPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
            let errorMessages = Object.values(result.errors).flat().join('\n');
            toast.error(`Event update failed:\n${errorMessages}`, { duration: 6000 });
        } else {
            throw new Error(result.message || 'Failed to update event.');
        }
      } else {
        toast.success(`Event "${result.title}" updated successfully!`);
        router.push(`/events/${event.id}`); 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Event update failed: ${errorMessage}`);
      console.error("Error updating event:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || loadingEvent || (!isAuthenticated && !authLoading)) {
    return <EditEventSkeleton />;
  }
  
  if (pageError) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-destructive">{pageError}</p>
        <Button onClick={() => router.push(`/events/${eventId}`)} className="mt-4">Back to Event</Button>
      </div>
    );
  }
  
  if (!event || (user && event.organizerId.toString() !== user.id.toString() && !loadingEvent) ) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-muted-foreground">
          { !event ? "Event not found." : "You are not authorized to edit this event."}
        </p>
        <Button onClick={() => router.push('/events')} className="mt-4">Go to Events</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><Edit className="mr-2 h-6 w-6 text-primary"/>Edit Event: {event?.title}</CardTitle>
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
                      <Input {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value || NO_COMMUNITY_VALUE} disabled={loadingCommunities}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingCommunities ? "Loading communities..." : "Select a community (optional)"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value={NO_COMMUNITY_VALUE}>None (General event)</SelectItem>
                        {memberCommunities.map(community => (
                            <SelectItem key={community.id!} value={community.id!}>{community.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
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
                                    const currentFieldDate = new Date(field.value);
                                    newDate.setHours(currentFieldDate.getHours());
                                    newDate.setMinutes(currentFieldDate.getMinutes());
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
                                    defaultValue={field.value ? format(new Date(field.value), "HH:mm") : "09:00"}
                                    onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const currentDate = field.value ? new Date(field.value) : new Date(); 
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
                                     const currentFieldDate = new Date(field.value);
                                    newDate.setHours(currentFieldDate.getHours());
                                    newDate.setMinutes(currentFieldDate.getMinutes());
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
                                    defaultValue={field.value ? format(new Date(field.value), "HH:mm") : "17:00"}
                                     onChange={(e) => {
                                        const time = e.target.value;
                                        const [hours, minutes] = time.split(':').map(Number);
                                        const currentDate = field.value ? new Date(field.value) : new Date();
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
                        <Input placeholder="e.g., Online or 123 Main St, Anytown" className="pl-10" {...field} value={field.value ?? ''} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Price (Optional)</FormLabel>
                      <FormControl>
                         <Input 
                            type="number" 
                            placeholder="Enter 0 for a free event" 
                            {...field}
                            value={field.value === undefined || field.value === null ? '' : String(field.value)}
                            onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : parseFloat(val));
                            }}
                            min="0"
                            step="0.01"
                        />
                      </FormControl>
                       <FormDescription>Leave blank or enter 0 for a free event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency (if priced)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., USD, EUR" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
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
                      <Input placeholder="e.g., AI, WebDev, Networking" {...field} value={field.value ?? ''} />
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
                      <Input 
                        type="number" 
                        placeholder="e.g., 100" 
                        {...field}
                        value={field.value === undefined || field.value === null ? '' : String(field.value)}
                        onChange={e => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseInt(val, 10));
                        }}
                        min="1" 
                        step="1"
                       />
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
                        <Input placeholder="https://example.com/your-event-image.png" className="pl-10" {...field} value={field.value ?? ''}/>
                      </div>
                    </FormControl>
                     <FormDescription>Link to an image for your event. Leave blank to use default.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="p-0 pt-8">
                <Button type="submit" disabled={isSubmitting || authLoading} className="w-full md:w-auto btn-gradient">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
