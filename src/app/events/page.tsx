'use client';

import { useState, useEffect } from 'react';
import type { Event } from '@/lib/types';
import { mockEvents } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Users, PlusCircle, Ticket, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as ShadCalendar } from "@/components/ui/calendar" // Renamed to avoid conflict

const EventCard = ({ event }: { event: Event }) => (
  <Card className="overflow-hidden shadow-subtle hover:shadow-md transition-shadow duration-300">
    <div className="relative h-48 w-full">
      <Image 
        src={event.imageUrl || `https://placehold.co/800x450.png`} 
        alt={event.title} 
        layout="fill" 
        objectFit="cover"
        data-ai-hint="event promotion"
      />
    </div>
    <CardHeader className="p-4">
      <CardTitle className="font-headline text-lg">{event.title}</CardTitle>
      <CardDescription className="text-sm text-primary flex items-center pt-1">
        <Calendar className="h-4 w-4 mr-2" />
        {format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a")}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
      {event.location && (
        <div className="text-xs text-muted-foreground flex items-center mb-1">
          <MapPin className="h-3 w-3 mr-1.5" /> {event.location}
        </div>
      )}
      <div className="text-xs text-muted-foreground flex items-center">
        <Users className="h-3 w-3 mr-1.5" /> {event.rsvps.length} attending
        {event.maxAttendees && ` / ${event.maxAttendees}`}
      </div>
    </CardContent>
    <CardFooter className="p-4 border-t">
      <Button asChild size="sm" className="w-full btn-gradient">
        <Link href={`/events/${event.id}`}>
          <Ticket className="h-4 w-4 mr-2" />
          View Details & RSVP
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

const EventCalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  // In a real app, you would fetch events for the selected month/date
  // and display them, potentially highlighting days with events on the calendar.

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Card className="flex-shrink-0 md:w-1/3 shadow-md">
        <ShadCalendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="p-0"
        />
      </Card>
      <Card className="flex-1 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Events for {date ? format(date, 'MMMM d, yyyy') : 'selected date'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder for events on selected date */}
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events scheduled for this day.</p>
            <p className="text-xs mt-1">Select another day or check the list view.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching events
    setTimeout(() => {
      setEvents(mockEvents);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    // Basic loading state
    return <div className="container mx-auto py-8 text-center">Loading events...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary">Community Events</h1>
        <Button asChild className="btn-gradient">
          <Link href="/events/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">No upcoming events. Check back soon!</p>
          )}
        </TabsContent>
        <TabsContent value="calendar">
          <EventCalendarView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
