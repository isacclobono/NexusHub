
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Users, PlusCircle, Ticket, Clock, Loader2, AlertTriangle, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';


const EventCardSkeleton = () => (
  <Card className="overflow-hidden shadow-sm">
    <Skeleton className="h-48 w-full" />
    <CardHeader className="p-4">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-3 w-1/3 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </CardContent>
    <CardFooter className="p-4 border-t">
      <Skeleton className="h-9 w-full" />
    </CardFooter>
  </Card>
);

const EventCard = ({ event }: { event: Event }) => {
  const isFreeEvent = event.price === undefined || event.price === null || event.price <= 0;
  const displayPrice = isFreeEvent ? "Free" : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD' }).format(event.price || 0)}`;

  return (
    <Card className="overflow-hidden shadow-subtle hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <Link href={`/events/${event.id}`} className="block relative h-48 w-full">
        <Image 
          src={event.imageUrl || `https://placehold.co/800x450.png`} 
          alt={event.title} 
          layout="fill" 
          objectFit="cover"
          data-ai-hint="event promotion"
          className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
        />
         <Badge variant="secondary" className="absolute top-2 right-2 text-sm bg-background/80 backdrop-blur-sm">
            {displayPrice}
         </Badge>
      </Link>
      <CardHeader className="p-4">
        <CardTitle className="font-headline text-lg hover:text-primary transition-colors">
          <Link href={`/events/${event.id}`}>{event.title}</Link>
        </CardTitle>
        <CardDescription className="text-sm text-primary flex items-center pt-1">
          <Calendar className="h-4 w-4 mr-2" />
          {event.startTime ? format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a") : 'Date TBD'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
        {event.location && (
          <div className="text-xs text-muted-foreground flex items-center mb-1">
            <MapPin className="h-3 w-3 mr-1.5" /> {event.location}
          </div>
        )}
        <div className="text-xs text-muted-foreground flex items-center">
          <Users className="h-3 w-3 mr-1.5" /> {event.rsvps?.length || 0} attending
          {event.maxAttendees && ` / ${event.maxAttendees}`}
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button asChild size="sm" className="w-full btn-gradient">
          <Link href={`/events/${event.id}`}>
            <Ticket className="h-4 w-4 mr-2" />
            {isFreeEvent ? 'View & RSVP' : `View & Get Ticket`}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const EventCalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  // In a real app, you would fetch events for the selected month/date from the API
  // and display them, potentially highlighting days with events on the calendar.

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Card className="flex-shrink-0 md:w-auto shadow-md">
        <ShadCalendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="p-0 rounded-md border"
        />
      </Card>
      <Card className="flex-1 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Events for {date ? format(date, 'MMMM d, yyyy') : 'selected date'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events scheduled for this day (Calendar view is illustrative).</p>
            <p className="text-xs mt-1">Select another day or check the list view for all events.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/events'); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch events: ${response.statusText}`);
      }
      const eventsData: Event[] = await response.json();
      setEvents(eventsData.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch (e) {
      console.error("Failed to fetch events data:", e);
      setError(e instanceof Error ? e.message : "Failed to load events.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);


  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Community Events</h1>
        <Button asChild className="btn-gradient">
          <Link href="/events/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          )}
          {!isLoading && error && (
            <div className="text-center py-10">
                <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
                <AlertTriangle className="h-6 w-6 mr-3" />
                <div>
                    <h2 className="font-semibold">Error loading events</h2>
                    <p className="text-sm">{error}</p>
                </div>
                </div>
            </div>
          )}
          {!isLoading && !error && events.length === 0 && (
             <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
              <Calendar className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
              <h2 className="text-2xl font-semibold mb-3">No Upcoming Events</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                There are no events scheduled at the moment. Why not create one?
              </p>
              <Button asChild className="btn-gradient">
                <Link href="/events/create">Create an Event</Link>
              </Button>
            </div>
          )}
          {!isLoading && !error && events.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="calendar">
          <EventCalendarView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
