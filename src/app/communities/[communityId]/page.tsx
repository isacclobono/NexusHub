
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Community, User, Post, Event as EventType } from '@/lib/types'; // Added Post, EventType
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UsersRound, UserPlus, LogOut, Loader2, AlertTriangle, Settings, ShieldCheck, Info, MessageSquare, CalendarDays, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth-provider';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from '@/components/feed/PostCard'; // For Discussion tab

const CommunityDetailSkeleton = () => (
  <div className="container mx-auto py-8">
    <Card className="shadow-lg overflow-hidden">
      <Skeleton className="h-48 w-full md:h-64 bg-muted" />
      <CardHeader className="p-6 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/2 mb-4" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Skeleton className="h-10 w-full md:w-1/3 mb-6" /> 
        <Tabs defaultValue="discussion">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-xl mb-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </TabsList>
          <TabsContent value="discussion">
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
);

const CommunityEventCard = ({ event }: { event: EventType }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <Link href={`/events/${event.id}`} className="block relative h-32 w-full group">
      <Image
        src={event.imageUrl || `https://placehold.co/400x200.png?text=${encodeURIComponent(event.title)}`}
        alt={event.title}
        layout="fill"
        objectFit="cover"
        data-ai-hint="event banner small"
        className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
      />
    </Link>
    <CardHeader className="p-3">
      <CardTitle className="text-md font-headline group-hover:text-primary transition-colors">
        <Link href={`/events/${event.id}`}>{event.title}</Link>
      </CardTitle>
      <CardDescription className="text-xs text-primary flex items-center pt-1">
        <CalendarDays className="h-3 w-3 mr-1.5" />
        {event.startTime ? format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a") : 'Date TBD'}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-3 pt-0">
      <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
    </CardContent>
  </Card>
);

const CommunityMemberCard = ({ member }: { member: User }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-4 flex items-center space-x-4">
      <Link href={`/profile/${member.id}`}>
        <Avatar className="h-12 w-12 border cursor-pointer hover:opacity-90 transition-opacity">
          <AvatarImage src={member.avatarUrl || `https://placehold.co/48x48.png`} alt={member.name} data-ai-hint="member avatar" />
          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div>
        <Link href={`/profile/${member.id}`}>
          <p className="font-semibold hover:underline">{member.name}</p>
        </Link>
        <p className="text-xs text-muted-foreground">Joined: {format(new Date(member.joinedDate), 'MMM yyyy')}</p>
      </div>
    </CardContent>
  </Card>
);


export default function CommunityDetailPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const { user: currentUser, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMembershipProcessing, setIsMembershipProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [communityEvents, setCommunityEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [communityMembers, setCommunityMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);


  const fetchCommunityDetails = useCallback(async () => {
    if (!communityId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/communities/${communityId}`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch community details: ${response.statusText}`);
      }
      const foundCommunity: Community = await response.json();
      setCommunity(foundCommunity);
    } catch (e) {
      console.error("Failed to fetch community details:", e);
      setError(e instanceof Error ? e.message : "Failed to load community details.");
      setCommunity(null);
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  const fetchCommunityContent = useCallback(async () => {
    if (!communityId) return;

    // Fetch Posts
    setLoadingPosts(true); setPostsError(null);
    try {
      const postsRes = await fetch(`/api/posts?communityId=${communityId}${currentUser ? `&forUserId=${currentUser.id}` : ''}`);
      if (!postsRes.ok) throw new Error('Failed to fetch community posts');
      setCommunityPosts(await postsRes.json());
    } catch (e) { setPostsError(e instanceof Error ? e.message : 'Error loading posts'); }
    finally { setLoadingPosts(false); }

    // Fetch Events
    setLoadingEvents(true); setEventsError(null);
    try {
      const eventsRes = await fetch(`/api/events?communityId=${communityId}`);
      if (!eventsRes.ok) throw new Error('Failed to fetch community events');
      setCommunityEvents(await eventsRes.json());
    } catch (e) { setEventsError(e instanceof Error ? e.message : 'Error loading events'); }
    finally { setLoadingEvents(false); }

    // Fetch Members
    setLoadingMembers(true); setMembersError(null);
    try {
      const membersRes = await fetch(`/api/communities/${communityId}/members`);
      if (!membersRes.ok) throw new Error('Failed to fetch community members');
      setCommunityMembers(await membersRes.json());
    } catch (e) { setMembersError(e instanceof Error ? e.message : 'Error loading members'); }
    finally { setLoadingMembers(false); }

  }, [communityId, currentUser]);


  useEffect(() => {
    if(communityId) {
        fetchCommunityDetails();
        fetchCommunityContent();
    }
  }, [communityId, fetchCommunityDetails, fetchCommunityContent]);

  const handlePostUpdate = () => {
    if(communityId) fetchCommunityContent(); // Re-fetch posts
  }


  const handleJoinLeaveCommunity = async () => {
    if (!isAuthenticated || !currentUser || !currentUser.id) {
        toast.error("Please login to join or leave communities.");
        router.push(`/login?redirect=/communities/${communityId}`);
        return;
    }
    if (!community || !community.id) { 
        toast.error("Community details not loaded yet.");
        return;
    }

    setIsMembershipProcessing(true);
    const isMember = community.memberIds?.some(id => id.toString() === currentUser.id!.toString());
    const endpoint = isMember ? `/api/communities/${community.id}/members?userId=${currentUser.id}` : `/api/communities/${community.id}/members`;
    const method = isMember ? 'DELETE' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            ...(method === 'POST' && { body: JSON.stringify({ userId: currentUser.id }) }),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Failed to ${isMember ? 'leave' : 'join'} community.`);
        }
        
        toast.success(result.message || `Successfully ${isMember ? 'left' : 'joined'} ${community.name}!`);
        await fetchCommunityDetails(); 
        await fetchCommunityContent(); // Re-fetch members
        await refreshUser(); 

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        toast.error(errorMessage);
        console.error("Join/Leave Error:", err);
    } finally {
        setIsMembershipProcessing(false);
    }
  };
  
  if (isLoading || authLoading) {
    return <CommunityDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h2 className="font-semibold">Error loading community</h2>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
       <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-muted/50 text-muted-foreground border border-dashed p-8 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="h-10 w-10 mr-4" />
          <div>
            <h2 className="text-xl font-semibold">Community Not Found</h2>
            <p>The community you are looking for does not exist or may have been removed.</p>
            <Button asChild variant="link" className="mt-4">
              <Link href="/communities">Back to Communities</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = currentUser?.id === community.creatorId.toString();
  const isMember = currentUser && community.memberIds?.some(id => id.toString() === currentUser.id!.toString());

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl overflow-hidden">
        <div className="relative h-48 md:h-64 w-full bg-muted group">
          <Image
            src={community.coverImageUrl || `https://placehold.co/1200x400.png?text=${encodeURIComponent(community.name)}`}
            alt={`${community.name} cover image`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="community cover photo"
            priority
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
           <div className="absolute bottom-0 left-0 p-6">
             <h1 className="text-3xl md:text-4xl font-headline font-bold text-white shadow-text">{community.name}</h1>
             <Badge variant={community.privacy === 'public' ? 'secondary' : 'outline'} className="text-xs capitalize mt-2 bg-background/80 backdrop-blur-sm">
                <ShieldCheck className="h-3 w-3 mr-1" /> {community.privacy}
             </Badge>
           </div>
        </div>
        
        <CardHeader className="p-6 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <p className="text-muted-foreground text-sm md:max-w-3xl">{community.description}</p>
                <div className="flex-shrink-0 w-full md:w-auto">
                    {isAuthenticated && (
                         <Button 
                            onClick={handleJoinLeaveCommunity} 
                            size="default" 
                            className="w-full md:w-auto btn-gradient" 
                            disabled={isMembershipProcessing || (isCreator && community.privacy === 'public')}
                         >
                            {isMembershipProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isMember ? <LogOut className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
                            {isMember ? 'Leave Community' : 'Join Community'}
                        </Button>
                    )}
                    {!isAuthenticated && (
                         <Button onClick={() => router.push(`/login?redirect=/communities/${communityId}`)} size="default" className="w-full md:w-auto">
                            Login to Join
                        </Button>
                    )}
                    {isCreator && (
                        <Button variant="outline" size="sm" className="w-full md:w-auto mt-2 md:mt-0 md:ml-2" onClick={() => toast.info("Community settings not implemented yet.")}>
                            <Settings className="mr-2 h-4 w-4" /> Settings
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground mt-4">
                <div className="flex items-center">
                    <UsersRound className="h-4 w-4 mr-1.5 text-primary" /> {communityMembers.length || 0} Members
                </div>
                {community.creator && (
                     <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-1.5 border">
                            <AvatarImage src={community.creator.avatarUrl || `https://placehold.co/24x24.png`} alt={community.creator.name} data-ai-hint="admin avatar" />
                            <AvatarFallback>{community.creator.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        Created by <Link href={`/profile/${community.creator.id}`} className="ml-1 font-medium text-primary hover:underline">{community.creator.name}</Link>
                    </div>
                )}
                 <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1.5 text-primary" /> Created {format(new Date(community.createdAt), "MMM d, yyyy")}
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-6">
            <Tabs defaultValue="discussion" className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4 max-w-xl">
                <TabsTrigger value="discussion"><MessageSquare className="mr-2 h-4 w-4" />Discussion</TabsTrigger>
                <TabsTrigger value="events"><CalendarDays className="mr-2 h-4 w-4" />Events</TabsTrigger>
                <TabsTrigger value="members"><UsersRound className="mr-2 h-4 w-4" />Members</TabsTrigger>
                <TabsTrigger value="about"><Info className="mr-2 h-4 w-4" />About</TabsTrigger>
              </TabsList>

              <TabsContent value="discussion">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Community Feed</CardTitle>
                        {isMember && (
                            <Button size="sm" asChild className="btn-gradient">
                                <Link href={`/posts/create?communityId=${communityId}`}><PlusCircle className="mr-2 h-4 w-4"/>Create Post</Link>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loadingPosts && <div className="space-y-4"><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/></div>}
                        {postsError && <p className="text-destructive text-center py-5">{postsError}</p>}
                        {!loadingPosts && !postsError && communityPosts.length > 0 ? (
                            <div className="space-y-6">
                                {communityPosts.map(post => <PostCard key={post.id} post={post} onToggleBookmark={handlePostUpdate} onToggleLike={handlePostUpdate} />)}
                            </div>
                        ) : (
                           !loadingPosts && !postsError && 
                           <div className="text-center py-10 text-muted-foreground">
                             <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                             <p>No posts in this community yet. Be the first to share something!</p>
                           </div>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="events">
                 <Card>
                    <CardHeader  className="flex flex-row items-center justify-between">
                        <CardTitle>Community Events</CardTitle>
                        {isMember && (
                            <Button size="sm" asChild className="btn-gradient">
                                <Link href={`/events/create?communityId=${communityId}`}><PlusCircle className="mr-2 h-4 w-4"/>Create Event</Link>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loadingEvents && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-40 w-full"/><Skeleton className="h-40 w-full"/></div>}
                        {eventsError && <p className="text-destructive text-center py-5">{eventsError}</p>}
                        {!loadingEvents && !eventsError && communityEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {communityEvents.map(event => <CommunityEventCard key={event.id} event={event} />)}
                            </div>
                        ) : (
                            !loadingEvents && !eventsError &&
                            <div className="text-center py-10 text-muted-foreground">
                                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <p>No events scheduled for this community yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="members">
                 <Card>
                    <CardHeader><CardTitle>Members ({communityMembers.length || 0})</CardTitle></CardHeader>
                    <CardContent>
                       {loadingMembers && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-20 w-full"/><Skeleton className="h-20 w-full"/></div>}
                       {membersError && <p className="text-destructive text-center py-5">{membersError}</p>}
                       {!loadingMembers && !membersError && communityMembers.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                               {communityMembers.map(member => <CommunityMemberCard key={member.id} member={member} />)}
                           </div>
                       ) : (
                           !loadingMembers && !membersError &&
                           <div className="text-center py-10 text-muted-foreground">
                               <UsersRound className="h-12 w-12 mx-auto mb-4 opacity-30" />
                               <p>This community doesn't have many members yet (besides the creator).</p>
                           </div>
                       )}
                    </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="about">
                <Card>
                    <CardHeader><CardTitle>About {community.name}</CardTitle></CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <p>{community.description}</p>
                        <h4 className="font-semibold mt-4">Privacy:</h4>
                        <p className="capitalize">{community.privacy}</p>
                        {/* Future: Add rules, more details here */}
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

