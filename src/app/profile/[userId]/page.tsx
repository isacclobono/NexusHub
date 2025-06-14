
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { User, Post, Badge as BadgeType, Comment as CommentType } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Edit3, Star, Loader2, AlertTriangle } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { format } from 'date-fns';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth-provider';


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


export default function UserProfilePage() {
  const params = useParams();
  const routeUserId = params.userId as string;
  
  const { user: authUser, loading: authLoading } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userBadges, setUserBadges] = useState<BadgeType[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // For enriching post comments
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIdToFetch = routeUserId === 'me' && authUser ? authUser.id : routeUserId;

  const fetchProfileData = useCallback(async (currentUserId: string) => {
    if (!currentUserId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [usersResponse, postsResponse, badgesResponse] = await Promise.all([
        fetch('/api/data/users.json'),
        fetch('/api/data/posts.json'),
        fetch('/api/data/badges.json')
      ]);

      if (!usersResponse.ok) throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
      if (!postsResponse.ok) throw new Error(`Failed to fetch posts: ${postsResponse.statusText}`);
      if (!badgesResponse.ok) throw new Error(`Failed to fetch badges: ${badgesResponse.statusText}`);
      
      const usersData: User[] = await usersResponse.json();
      setAllUsers(usersData); // Store all users for comment enrichment
      const postsData: Post[] = await postsResponse.json();
      const badgesData: BadgeType[] = await badgesResponse.json();

      const foundUser = usersData.find(u => u.id === currentUserId);
      setProfileUser(foundUser || null);

      if (foundUser) {
        const enrichedPosts = postsData
          .filter(p => p.authorId === foundUser.id && p.status === 'published')
          .map(post => {
            const comments = post.comments?.map(comment => ({
                ...comment,
                author: usersData.find(u => u.id === comment.authorId) || 
                        { id: 'unknown', name: 'Unknown Commenter', reputation: 0, joinedDate: new Date().toISOString() } as User
            })) || [];
            return {
                ...post,
                author: foundUser,
                comments,
            };
          });
        setUserPosts(enrichedPosts);
        // Assign all badges to the user for demo purposes on their own profile or a sample selection
        setUserBadges(foundUser.id === authUser?.id ? badgesData : badgesData.slice(0, Math.floor(Math.random() * badgesData.length + 1))); 
      } else {
        setError("User not found.");
      }
    } catch (e) {
      console.error("Failed to fetch profile data:", e);
      setError(e instanceof Error ? e.message : "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]); // Added authUser.id to dependency array
  
  useEffect(() => {
    if (!authLoading && userIdToFetch) {
      fetchProfileData(userIdToFetch);
    } else if (!authLoading && routeUserId !== 'me' && !userIdToFetch) { // Case where routeUserId is direct ID and authUser is null
       fetchProfileData(routeUserId);
    }
  }, [userIdToFetch, authLoading, routeUserId, fetchProfileData]);


  if (authLoading || isLoading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
        <div className="container mx-auto py-8 text-center">
            <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
                <h2 className="font-semibold">Error loading profile</h2>
                <p className="text-sm">{error}</p>
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
          <Image src="https://placehold.co/1200x250.png" alt="Profile banner" layout="fill" objectFit="cover" data-ai-hint="abstract banner pattern" className="opacity-50"/>
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
                <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1" /> Joined {format(new Date(profileUser.joinedDate), 'MMMM yyyy')}</span>
                <span className="flex items-center"><Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" /> {profileUser.reputation} Reputation</span>
              </div>
            </div>
            {isOwnProfile && (
              <div className="pt-4 md:pt-20">
                <Button variant="outline"><Edit3 className="h-4 w-4 mr-2" /> Edit Profile</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 mb-6">
          <TabsTrigger value="posts">Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="activity" disabled>Activity</TabsTrigger>
          <TabsTrigger value="badges">Badges ({userBadges.length})</TabsTrigger>
          <TabsTrigger value="events" disabled>Events</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          {userPosts.length > 0 ? (
            <div className="space-y-6">
              {userPosts.map(post => (
                <PostCard key={post.id} post={post} allUsers={allUsers} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10">This user hasn't made any posts yet.</p>
          )}
        </TabsContent>
        <TabsContent value="activity">
          <p className="text-muted-foreground text-center py-10">Activity feed coming soon!</p>
        </TabsContent>
         <TabsContent value="badges">
          {userBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {userBadges.map(badge => (
                <BadgeDisplayComponent key={badge.id} badge={badge} />
              ))}
            </div>
          ) : (
             <p className="text-muted-foreground text-center py-10">This user has not earned any badges yet.</p>
          )}
        </TabsContent>
        <TabsContent value="events">
          <p className="text-muted-foreground text-center py-10">Event participation history coming soon!</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
