
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Event, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, MapPin, Users, Clock, Ticket, Edit, Trash2, UserCircle, Loader2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const EventDetailSkeleton = () => (
  <div className="container mx-auto py-8">
    <Card className="shadow-lg">
      <Skeleton className="h-64 w-full md:h-80 rounded-t-lg" />
      <CardHeader className="p-6">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-4" />
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Skeleton className="h-20 w-full mb-6" />
        <div className="mb-6">
          <Skeleton className="h-6 w-1/3 mb-3" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-1/4 mb-3" />
          <div className="flex flex-wrap gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);


export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [eventsResponse, usersResponse] = await Promise.all([
        fetch('/api/data/events.json'),
        fetch('/api/data/users.json')
      ]);

      if (!eventsResponse.ok) throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      if (!usersResponse.ok) throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
      
      const eventsData: Event[] = await eventsResponse.json();
      const usersData: User[] = await usersResponse.json();

      const foundEvent = eventsData.find(e => e.id === eventId);

      if (foundEvent) {
        const organizer = usersData.find(u => u.id === foundEvent.organizerId);
        const rsvps = foundEvent.rsvpIds.map(id => usersData.find(u => u.id === id)).filter(Boolean) as User[];
        
        setEvent({
          ...foundEvent,
          organizer: organizer || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString() } as User,
          rsvps,
        });
      } else {
        setError("Event not found.");
      }
    } catch (e) {
      console.error("Failed to fetch event details:", e);
      setError(e instanceof Error ? e.message : "Failed to load event details.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!authLoading) { // Only fetch if auth state is resolved
        fetchEventDetails();
    }
  }, [eventId, authLoading, fetchEventDetails]);

  const handleRSVP = () => {
    // Mock RSVP functionality
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please login to RSVP for events.", variant: "destructive" });
        return;
    }
    if (event && event.rsvps?.some(u => u.id === currentUser.id)) {
        toast({ title: "Already RSVP'd", description: "You have already RSVP'd to this event." });
    } else {
        toast({ title: "RSVP Successful!", description: `You've RSVP'd for ${event?.title}.`});
        // In a real app, update the event state and call an API
        // For demo, we could add current user to rsvps if event is not null
        if (event) {
            setEvent(prev => prev ? ({ ...prev, rsvps: [...(prev.rsvps || []), currentUser], rsvpIds: [...prev.rsvpIds, currentUser.id] }) : null);
        }
    }
  };

  if (isLoading || authLoading) {
    return <EventDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h2 className="font-semibold">Error loading event</h2>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
       <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-muted/50 text-muted-foreground border border-dashed p-8 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="h-10 w-10 mr-4" />
          <div>
            <h2 className="text-xl font-semibold">Event Not Found</h2>
            <p>The event you are looking for does not exist or may have been removed.</p>
            <Button asChild variant="link" className="mt-4">
              <Link href="/events">Back to Events</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOrganizer = currentUser?.id === event.organizerId;
  const hasRSVPd = event.rsvps?.some(u => u.id === currentUser?.id);

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl overflow-hidden">
        <div className="relative h-64 md:h-80 w-full bg-muted">
          <Image
            src={event.imageUrl || `https://placehold.co/1200x400.png`}
            alt={event.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint="event banner"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
           <div className="absolute bottom-0 left-0 p-6">
             <h1 className="text-3xl md:text-4xl font-headline font-bold text-white shadow-text">{event.title}</h1>
           </div>
        </div>
        
        <div className="grid md:grid-cols-3">
            <div className="md:col-span-2 p-6 space-y-6">
                 <CardDescription className="text-lg">
                    {event.description}
                </CardDescription>

                <div className="space-y-3">
                    <div className="flex items-start text-foreground">
                        <CalendarDays className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                        <div>
                            <p className="font-semibold">Date & Time</p>
                            <p>{format(new Date(event.startTime), "EEEE, MMM d, yyyy 'from' h:mm a")} to</p>
                            <p>{format(new Date(event.endTime), "h:mm a (z)")}</p>
                        </div>
                    </div>
                    {event.location && (
                        <div className="flex items-start text-foreground">
                            <MapPin className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                            <div>
                                <p className="font-semibold">Location</p>
                                <p>{event.location}</p>
                            </div>
                        </div>
                    )}
                </div>
                 {event.tags && event.tags.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold mb-2 text-foreground">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map(tag => (
                        <Link href={`/tags/${tag}`} key={tag} className="text-xs bg-secondary hover:bg-muted text-secondary-foreground px-2 py-1 rounded-full transition-colors">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="md:col-span-1 p-6 bg-muted/30 border-l space-y-6">
                {event.organizer && (
                     <div>
                        <h3 className="text-lg font-headline font-semibold mb-3 text-primary">Organized by</h3>
                        <Link href={`/profile/${event.organizer.id}`} className="flex items-center space-x-3 group">
                            <Avatar className="h-12 w-12 border-2 border-primary/30">
                            <AvatarImage src={event.organizer.avatarUrl || `https://placehold.co/60x60.png`} alt={event.organizer.name} data-ai-hint="profile avatar"/>
                            <AvatarFallback>{event.organizer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                            <p className="font-semibold group-hover:underline">{event.organizer.name}</p>
                            <p className="text-xs text-muted-foreground">Reputation: {event.organizer.reputation}</p>
                            </div>
                        </Link>
                    </div>
                )}

                <div>
                    <h3 className="text-lg font-headline font-semibold mb-3 text-primary flex items-center">
                        <Users className="h-5 w-5 mr-2"/>
                        Attendees ({event.rsvps?.length || 0} / {event.maxAttendees || 'Unlimited'})
                    </h3>
                    {event.rsvps && event.rsvps.length > 0 ? (
                        <div className="flex flex-wrap -space-x-2 overflow-hidden">
                        {event.rsvps.slice(0, 10).map(user => (
                            <Avatar key={user.id} className="h-10 w-10 border-2 border-background hover:z-10 transition-all">
                                <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png`} alt={user.name} data-ai-hint="attendee avatar"/>
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                        {event.rsvps.length > 10 && (
                             <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold border-2 border-background">
                                +{event.rsvps.length - 10}
                            </div>
                        )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No RSVPs yet. Be the first!</p>
                    )}
                </div>

                 <Button onClick={handleRSVP} size="lg" className="w-full btn-gradient" disabled={isLoading}>
                    <Ticket className="h-5 w-5 mr-2" />
                    {hasRSVPd ? "You're Going!" : "RSVP to this Event"}
                </Button>

                {isOrganizer && (
                    <div className="pt-4 border-t mt-6">
                        <h3 className="text-md font-semibold mb-2">Organizer Actions</h3>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/> Edit Event</Button>
                            <Button variant="destructive" size="sm" onClick={() => toast({title: "Delete Action (Not Implemented)", description: "This event would be deleted.", variant:"destructive"})}><Trash2 className="mr-2 h-4 w-4" /> Delete Event</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
}
