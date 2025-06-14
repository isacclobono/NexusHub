
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Event, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; 
import { CalendarDays, MapPin, Users, Ticket, Edit, Trash2, Loader2, AlertTriangle, DollarSign } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/hooks/use-auth-provider';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

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
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch event details: ${response.statusText}`);
      }
      const foundEvent: Event = await response.json();
      setEvent(foundEvent);
    } catch (e) {
      console.error("Failed to fetch event details:", e);
      setError(e instanceof Error ? e.message : "Failed to load event details.");
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if(eventId) {
        fetchEventDetails();
    }
  }, [eventId, fetchEventDetails]);

  const handleRSVP = async () => {
    if (!isAuthenticated || !currentUser || !currentUser.id) {
        toast.error("Please login to RSVP for events.");
        router.push(`/login?redirect=/events/${eventId}`);
        return;
    }
    if (!event || !event.id) { 
        toast.error("Event details not loaded yet or event ID is missing.");
        return;
    }

    setIsRsvpLoading(true);
    try {
        const response = await fetch(`/api/events/${event.id}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id }),
        });
        const result = await response.json();

        if (!response.ok || !result.event) {
            throw new Error(result.message || 'Failed to RSVP for the event.');
        }
        
        setEvent(result.event as Event); 
        toast.success(result.message || `Successfully RSVP'd for ${event.title}!`);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during RSVP.";
        toast.error(errorMessage);
        console.error("RSVP Error:", err);
    } finally {
        setIsRsvpLoading(false);
    }
  };
  
  const handleDeleteEvent = async () => {
    if (!event || !currentUser || currentUser.id !== event.organizer?.id) { 
      toast.error("You are not authorized to delete this event.");
      return;
    }
    setIsDeleting(true); 
    try {
      const response = await fetch(`/api/events/${event.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }) 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete event.");
      }
      toast.success(`Event "${event.title}" deleted.`);
      router.push('/events');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete event."
      toast.error(msg);
      console.error("Delete event error:", err);
    } finally {
      setIsDeleting(false);
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

  const isOrganizer = currentUser?.id === event.organizer?.id; 
  const hasRSVPd = event.rsvps?.some(u => u.id === currentUser?.id);
  const rsvpCount = event.rsvps?.length || 0;
  const isFreeEvent = event.price === undefined || event.price === null || event.price <= 0;
  const displayPrice = isFreeEvent ? "Free" : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD' }).format(event.price || 0)}`;


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
           <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end">
             <h1 className="text-3xl md:text-4xl font-headline font-bold text-white shadow-text">{event.title}</h1>
             <Badge variant="secondary" className="text-lg bg-background/80 backdrop-blur-sm px-4 py-2">
                <DollarSign className="h-5 w-5 mr-2" />
                {displayPrice}
             </Badge>
           </div>
        </div>
        
        <div className="grid md:grid-cols-3">
            <div className="md:col-span-2 p-6 space-y-6">
                 <p className="text-lg text-foreground/90">
                    {event.description}
                </p>

                <div className="space-y-3">
                    <div className="flex items-start text-foreground">
                        <CalendarDays className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                        <div>
                            <p className="font-semibold">Date & Time</p>
                            <p>{event.startTime ? format(new Date(event.startTime), "EEEE, MMM d, yyyy 'from' h:mm a") : 'Date TBD'} to</p>
                            <p>{event.endTime ? format(new Date(event.endTime), "h:mm a (z)") : 'Time TBD'}</p>
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
                
                {event.rsvps && event.rsvps.length > 0 && (
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-headline font-semibold mb-3 text-primary">Who's Going ({rsvpCount})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {event.rsvps.map(attendee => (
                                <Link href={`/profile/${attendee.id}`} key={attendee.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors group">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={attendee.avatarUrl || `https://placehold.co/40x40.png`} alt={attendee.name} data-ai-hint="attendee avatar"/>
                                        <AvatarFallback>{attendee.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm group-hover:text-primary">{attendee.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            <div className="md:col-span-1 p-6 bg-muted/30 border-l space-y-6">
                {event.organizer && event.organizer.id !== 'unknown' && ( 
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
                    <h3 className="text-lg font-headline font-semibold mb-1 text-primary flex items-center">
                        <Users className="h-5 w-5 mr-2"/>
                        Attendees ({rsvpCount} / {event.maxAttendees || 'Unlimited'})
                    </h3>
                     <p className="text-xs text-muted-foreground mb-3">A quick glance at who's coming.</p>
                    {event.rsvps && event.rsvps.length > 0 ? (
                        <TooltipProvider>
                        <div className="flex flex-wrap -space-x-2 overflow-hidden">
                        {event.rsvps.slice(0, 10).map(user => (
                             <Tooltip key={user.id}>
                                <TooltipTrigger asChild>
                                    <Link href={`/profile/${user.id}`}>
                                        <Avatar className="h-10 w-10 border-2 border-background hover:z-10 transition-all cursor-pointer">
                                            <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png`} alt={user.name} data-ai-hint="attendee avatar"/>
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>{user.name}</TooltipContent>
                            </Tooltip>
                        ))}
                        {event.rsvps.length > 10 && (
                             <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold border-2 border-background">
                                +{event.rsvps.length - 10}
                            </div>
                        )}
                        </div>
                        </TooltipProvider>
                    ) : (
                        <p className="text-sm text-muted-foreground">No RSVPs yet. Be the first!</p>
                    )}
                </div>

                 <Button onClick={handleRSVP} size="lg" className="w-full btn-gradient" disabled={isRsvpLoading || (!isOrganizer && !!event.maxAttendees && rsvpCount >= event.maxAttendees && !hasRSVPd) }>
                    {isRsvpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="h-5 w-5 mr-2" />}
                    {hasRSVPd ? "You're Going!" : ((!isOrganizer && !!event.maxAttendees && rsvpCount >= event.maxAttendees) ? "Event Full" : (isFreeEvent ? "RSVP to this Event" : `Get Ticket (${displayPrice})`))}
                </Button>
                {!isFreeEvent && <p className="text-xs text-muted-foreground text-center mt-1">(Payment processing not implemented for this demo)</p>}


                {isOrganizer && (
                    <div className="pt-4 border-t mt-6">
                        <h3 className="text-md font-semibold mb-2">Organizer Actions</h3>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => toast.error("Edit event functionality not implemented.")}><Edit className="mr-2 h-4 w-4"/> Edit Event</Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isDeleting}>
                                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                  Delete Event
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the event "{event.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteEvent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Yes, delete event
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
}
