
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { User, Post, Comment as CommentType, Event as EventType, Badge as BadgeType } from '@/lib/types'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Edit3, Star, Loader2, AlertTriangle, MessageSquare, Activity, Award, Calendar as CalendarIconLucide, DollarSign } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { format, formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth-provider';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';

const BadgeDisplayComponent = ({ badge }: { badge: BadgeType }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center p-2 border rounded-lg bg-card hover:shadow-md transition-shadow w-24 h-24 justify-center cursor-default">
          <Image src={badge.iconUrl} alt={badge.name} width={32} height={32} className="mb-1 rounded-full" data-ai-hint="badge achievement"/>
          <p className="text-xs font-medium text-center truncate w-full">{badge.name}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{badge.name}</p>
        <p className="text-xs text-muted-foreground">{badge.description}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ProfileSkeleton = () => (
  <div className="container mx-auto py-8">
    <Card className="mb-8 shadow-lg overflow-hidden">
      <Skeleton className="h-40 bg-muted/50" />
      <CardContent className="p-6 pt-0 relative">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16 md:-mt-20">
          <Skeleton className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-card shadow-lg" />
          <div className="flex-1 pt-4 md:pt-20 text-center md:text-left">
            <Skeleton className="h-8 w-48 mb-2 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-64 mb-2 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-32 mb-4 mx-auto md:mx-0" />
          </div>
          <div className="pt-4 md:pt-20">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </TabsList>
      <TabsContent value="posts">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

const ActivityCommentCard = ({ comment }: { comment: CommentType }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground mb-1">
        Commented on <Link href={`/posts/${comment.postId.toString()}`} className="text-primary hover:underline font-medium">{comment.postTitle || "a post"}</Link>
        <span className="ml-2 text-xs">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
      </p>
      <p className="text-foreground line-clamp-3">{comment.content}</p>
    </CardContent>
  </Card>
);

const ActivityEventCard = ({ event }: { event: EventType }) => {
  const isFreeEvent = event.price === undefined || event.price === null || event.price <= 0;
  const displayPrice = isFreeEvent ? "Free" : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD' }).format(event.price || 0)}`;

  return (
   <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-md font-headline">
        <Link href={`/events/${event.id}`} className="hover:text-primary">{event.title}</Link>
      </CardTitle>
      <div className="flex justify-between items-center">
        <CardDescription className="text-xs text-primary flex items-center pt-1">
          <CalendarIconLucide className="h-3 w-3 mr-1.5" />
          {event.startTime ? format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a") : 'Date TBD'}
        </CardDescription>
        <Badge variant="outline" className="text-xs">{displayPrice}</Badge>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
    </CardContent>
    <CardFooter className="p-4 border-t">
      <Button asChild size="xs" variant="link" className="p-0 h-auto text-primary">
        <Link href={`/events/${event.id}`}>View Event</Link>
      </Button>
    </CardFooter>
  </Card>
 );
};


const OrganizedEventCard = ({ event }: { event: EventType }) => {
  const isFreeEvent = event.price === undefined || event.price === null || event.price <= 0;
  const displayPrice = isFreeEvent ? "Free" : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: event.currency || 'USD' }).format(event.price || 0)}`;
  
  return (
  <Card className="shadow-sm hover:shadow-md transition-shadow group">
    <Link href={`/events/${event.id}`} className="block relative h-40 w-full">
      <Image 
        src={event.imageUrl || `https://placehold.co/800x450.png`} 
        alt={event.title} 
        layout="fill" 
        objectFit="cover"
        data-ai-hint="event highlight"
        className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
      />
       <Badge variant="secondary" className="absolute top-2 right-2 text-sm bg-background/80 backdrop-blur-sm">
            {displayPrice}
       </Badge>
    </Link>
    <CardHeader className="p-4">
      <CardTitle className="text-lg font-headline hover:text-primary transition-colors">
        <Link href={`/events/${event.id}`}>{event.title}</Link>
      </CardTitle>
      <CardDescription className="text-sm text-primary flex items-center pt-1">
        <CalendarDays className="h-4 w-4 mr-2" />
        {event.startTime ? format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a") : 'Date TBD'}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-xs text-muted-foreground line-clamp-2">Attendees: {event.rsvps?.length || 0}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</p>
    </CardContent>
     <CardFooter className="p-4 border-t">
      <Button asChild size="sm" className="w-full btn-gradient">
        <Link href={`/events/${event.id}`}>View & Manage</Link>
      </Button>
    </CardFooter>
  </Card>
 );
};


export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const routeUserId = params.userId as string;
  
  const { user: authUser, loading: authLoading, refreshUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string|null>(null);

  const [userComments, setUserComments] = useState<CommentType[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string|null>(null);
  
  const [rsvpdEvents, setRsvpdEvents] = useState<EventType[]>([]);
  const [loadingRsvpdEvents, setLoadingRsvpdEvents] = useState(true);
  const [rsvpdEventsError, setRsvpdEventsError] = useState<string|null>(null);

  const [organizedEvents, setOrganizedEvents] = useState<EventType[]>([]);
  const [loadingOrganizedEvents, setLoadingOrganizedEvents] = useState(true);
  const [organizedEventsError, setOrganizedEventsError] = useState<string|null>(null);

  const [userBadges, setUserBadges] = useState<BadgeType[]>([]); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const userIdToFetch = routeUserId === 'me' && authUser ? authUser.id : routeUserId;

  const fetchProfileData = useCallback(async (currentProfileId: string) => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const userResponse = await fetch(`/api/users/${currentProfileId}`);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || `Failed to fetch user data: ${userResponse.statusText}`);
      }
      const foundUser: User = await userResponse.json();
      setProfileUser(foundUser);

      // Badges remain static for now
      const badgesResponse = await fetch('/api/data/badges.json'); 
      if (!badgesResponse.ok) console.warn(`Failed to fetch badges: ${badgesResponse.statusText}`);
      else {
        const badgesData: BadgeType[] = await badgesResponse.json();
        setUserBadges(foundUser.id === authUser?.id ? badgesData : badgesData.slice(0, Math.floor(Math.random() * badgesData.length + 1))); 
      }

    } catch (e) {
      console.error("Failed to fetch profile user data:", e);
      setProfileError(e instanceof Error ? e.message : "Failed to load profile.");
      setProfileUser(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [authUser]);

  const fetchUserPosts = useCallback(async (currentProfileId: string) => {
    setLoadingPosts(true);
    setPostsError(null);
    try {
      const forUserIdParam = authUser ? `&forUserId=${authUser.id}` : "";
      const postsResponse = await fetch(`/api/posts?authorId=${currentProfileId}${forUserIdParam}`); 
      if (!postsResponse.ok) {
          const errorData = await postsResponse.json();
          throw new Error(errorData.message || `Failed to fetch posts`);
      }
      const postsData: Post[] = await postsResponse.json();
      setUserPosts(postsData.filter(p => p.status === 'published'));
    } catch (e) {
        setPostsError(e instanceof Error ? e.message : "Failed to load posts.");
    } finally {
        setLoadingPosts(false);
    }
  }, [authUser]);
  
  const fetchUserComments = useCallback(async (currentProfileId: string) => {
    setLoadingComments(true);
    setCommentsError(null);
    try {
        const commentsResponse = await fetch(`/api/users/${currentProfileId}/comments`);
        if(!commentsResponse.ok) {
            const errorData = await commentsResponse.json();
            throw new Error(errorData.message || `Failed to fetch comments`);
        }
        setUserComments(await commentsResponse.json());
    } catch(e) {
        setCommentsError(e instanceof Error ? e.message : "Failed to load comments.");
    } finally {
        setLoadingComments(false);
    }
  }, []);

  const fetchRsvpdEvents = useCallback(async (currentProfileId: string) => {
    setLoadingRsvpdEvents(true);
    setRsvpdEventsError(null);
    try {
        const eventsResponse = await fetch(`/api/events?rsvpdBy=${currentProfileId}`);
        if(!eventsResponse.ok) {
            const errorData = await eventsResponse.json();
            throw new Error(errorData.message || `Failed to fetch RSVP'd events`);
        }
        setRsvpdEvents(await eventsResponse.json());
    } catch(e) {
        setRsvpdEventsError(e instanceof Error ? e.message : "Failed to load RSVP'd events.");
    } finally {
        setLoadingRsvpdEvents(false);
    }
  }, []);

  const fetchOrganizedEvents = useCallback(async (currentProfileId: string) => {
    setLoadingOrganizedEvents(true);
    setOrganizedEventsError(null);
    try {
        const eventsResponse = await fetch(`/api/events?organizerId=${currentProfileId}`);
        if(!eventsResponse.ok) {
            const errorData = await eventsResponse.json();
            throw new Error(errorData.message || `Failed to fetch organized events`);
        }
        setOrganizedEvents(await eventsResponse.json());
    } catch(e) {
        setOrganizedEventsError(e instanceof Error ? e.message : "Failed to load organized events.");
    } finally {
        setLoadingOrganizedEvents(false);
    }
  }, []);


  useEffect(() => {
    if (!authLoading && userIdToFetch) {
      fetchProfileData(userIdToFetch);
      fetchUserPosts(userIdToFetch);
      fetchUserComments(userIdToFetch);
      fetchRsvpdEvents(userIdToFetch);
      fetchOrganizedEvents(userIdToFetch);
    } else if (routeUserId === 'me' && !authUser && !authLoading) {
        toast.error("Please log in to view your profile.");
        router.push(`/login?redirect=/profile/me`);
    }
  }, [userIdToFetch, authLoading, authUser, fetchProfileData, fetchUserPosts, fetchUserComments, fetchRsvpdEvents, fetchOrganizedEvents, router, routeUserId]);


  if (authLoading || loadingProfile) {
    return <ProfileSkeleton />;
  }

  if (profileError) {
    return (
        <div className="container mx-auto py-8 text-center">
            <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
                <h2 className="font-semibold">Error loading profile</h2>
                <p className="text-sm">{profileError}</p>
            </div>
            </div>
        </div>
    );
  }

  if (!profileUser) {
    return (
         <div className="container mx-auto py-8 text-center">
            <div className="flex items-center justify-center bg-muted/50 text-muted-foreground border border-dashed p-8 rounded-lg max-w-md mx-auto">
            <AlertTriangle className="h-10 w-10 mr-4" />
            <div>
                <h2 className="text-xl font-semibold">User Not Found</h2>
                <p>The profile you are looking for does not exist.</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/members">Back to Members</Link>
                </Button>
            </div>
            </div>
      </div>
    );
  }
  
  const isOwnProfile = authUser?.id === profileUser.id;

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-xl overflow-hidden">
        <div className="h-40 md:h-48 bg-gradient-to-r from-primary via-accent to-purple-600 relative">
          <Image src="https://placehold.co/1200x250.png" alt="Profile banner" layout="fill" objectFit="cover" data-ai-hint="abstract pattern" className="opacity-50"/>
        </div>
        <CardContent className="p-6 pt-0 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16 md:-mt-20">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-card shadow-lg bg-background">
              <AvatarImage src={profileUser.avatarUrl || 'https://placehold.co/160x160.png'} alt={profileUser.name} data-ai-hint="profile avatar large" />
              <AvatarFallback className="text-5xl">{profileUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-4 md:pt-20 text-center md:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold font-headline">{profileUser.name}</h1>
              {profileUser.bio && <p className="text-muted-foreground mt-1 text-sm md:text-base">{profileUser.bio}</p>}
              <div className="flex items-center justify-center md:justify-start space-x-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1" /> Joined {profileUser.joinedDate ? format(new Date(profileUser.joinedDate), 'MMMM yyyy') : 'N/A'}</span>
                <span className="flex items-center"><Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" /> {profileUser.reputation} Reputation</span>
              </div>
            </div>
            {isOwnProfile && (
              <div className="pt-4 md:pt-20">
                <Button variant="outline" asChild><Link href="/settings"><Edit3 className="h-4 w-4 mr-2" /> Edit Profile</Link></Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
          <TabsTrigger value="posts">Posts ({loadingPosts ? '...' : userPosts.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="badges">Badges ({userBadges.length})</TabsTrigger>
          <TabsTrigger value="events">My Events ({loadingOrganizedEvents ? '...' : organizedEvents.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts">
          {loadingPosts && <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>}
          {postsError && <p className="text-destructive text-center py-10">{postsError}</p>}
          {!loadingPosts && !postsError && userPosts.length > 0 && (
            <div className="space-y-6">
              {userPosts.map(post => (
                <PostCard key={post.id!} post={post} onToggleBookmark={refreshUser} onToggleLike={refreshUser}/>
              ))}
            </div>
          )}
          {!loadingPosts && !postsError && userPosts.length === 0 && (
            <p className="text-muted-foreground text-center py-10">This user hasn't made any posts yet.</p>
          )}
        </TabsContent>

        <TabsContent value="activity">
            <div className="space-y-6">
                <section>
                    <h3 className="text-xl font-semibold mb-3 font-headline flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/>Recent Comments</h3>
                    {loadingComments && <div className="space-y-2"><Skeleton className="h-20 w-full"/><Skeleton className="h-20 w-full"/></div>}
                    {commentsError && <p className="text-destructive text-center py-5">{commentsError}</p>}
                    {!loadingComments && !commentsError && userComments.length > 0 ? (
                        userComments.map(comment => <ActivityCommentCard key={comment.id} comment={comment} />)
                    ) : (
                       !loadingComments && !commentsError && <p className="text-muted-foreground text-center py-5">No recent comments.</p>
                    )}
                </section>
                <section>
                    <h3 className="text-xl font-semibold mb-3 font-headline flex items-center"><Activity className="mr-2 h-5 w-5 text-primary"/>Events Attending</h3>
                    {loadingRsvpdEvents && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/></div>}
                    {rsvpdEventsError && <p className="text-destructive text-center py-5">{rsvpdEventsError}</p>}
                     {!loadingRsvpdEvents && !rsvpdEventsError && rsvpdEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rsvpdEvents.map(event => <ActivityEventCard key={event.id} event={event} />)}
                        </div>
                    ) : (
                       !loadingRsvpdEvents && !rsvpdEventsError && <p className="text-muted-foreground text-center py-5">Not RSVP'd to any upcoming events.</p>
                    )}
                </section>
            </div>
        </TabsContent>

         <TabsContent value="badges">
          {userBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {userBadges.map(badge => (
                <BadgeDisplayComponent key={badge.id} badge={badge} />
              ))}
            </div>
          ) : (
             <p className="text-muted-foreground text-center py-10 flex flex-col items-center">
                <Award className="h-12 w-12 mb-3 text-muted-foreground/50"/>
                This user has not earned any badges yet.
             </p>
          )}
        </TabsContent>

        <TabsContent value="events">
          <h3 className="text-xl font-semibold mb-4 font-headline flex items-center"><CalendarIconLucide className="mr-2 h-5 w-5 text-primary"/>Events Organized</h3>
          {loadingOrganizedEvents && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><Skeleton className="h-64 w-full"/><Skeleton className="h-64 w-full"/></div>}
          {organizedEventsError && <p className="text-destructive text-center py-10">{organizedEventsError}</p>}
          {!loadingOrganizedEvents && !organizedEventsError && organizedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizedEvents.map(event => (
                <OrganizedEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            !loadingOrganizedEvents && !organizedEventsError && 
            <p className="text-muted-foreground text-center py-10 flex flex-col items-center">
                <CalendarIconLucide className="h-12 w-12 mb-3 text-muted-foreground/50"/>
                This user hasn't organized any events.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
