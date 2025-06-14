'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User, Post, Badge as BadgeType } from '@/lib/types';
import { mockUsers, mockPosts, mockBadges } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Edit3, Award, Star } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { format } from 'date-fns';
import Image from 'next/image';

const Badge = ({ badge }: { badge: BadgeType }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center p-2 border rounded-lg bg-secondary/50 hover:shadow-md transition-shadow w-24 h-24 justify-center">
          <Image src={badge.iconUrl} alt={badge.name} width={32} height={32} className="mb-1 rounded-full" data-ai-hint="badge achievement" />
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


import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from '@/components/ui/skeleton';


const ProfileSkeleton = () => (
  <div className="container mx-auto py-8">
    <Card className="mb-8">
      <CardContent className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex-1 text-center md:text-left">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="flex items-center justify-center md:justify-start space-x-4 text-sm text-muted-foreground mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
    <Skeleton className="h-10 w-1/2 mb-4" /> 
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);


export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userBadges, setUserBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      // Simulate fetching user data
      const foundUser = mockUsers.find(u => u.id === userId || (userId === 'me' && u.id === mockUsers[0].id) );
      setUser(foundUser || null);
      if (foundUser) {
        setUserPosts(mockPosts.filter(p => p.author.id === foundUser.id && p.status === 'published'));
        setUserBadges(mockBadges.slice(0, Math.floor(Math.random() * mockBadges.length + 1))); // Random badges
      }
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [userId]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return <div className="container mx-auto py-8 text-center">User not found.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-lg overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary to-accent" data-ai-hint="abstract banner">
          <Image src="https://placehold.co/1200x200.png" alt="Profile banner" width={1200} height={200} className="object-cover w-full h-full"/>
        </div>
        <CardContent className="p-6 pt-0 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 -mt-16">
            <Avatar className="h-32 w-32 border-4 border-card shadow-md">
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile avatar large" />
              <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-16 text-center md:text-left">
              <h1 className="text-3xl font-bold font-headline">{user.name}</h1>
              {user.bio && <p className="text-muted-foreground mt-1">{user.bio}</p>}
              <div className="flex items-center justify-center md:justify-start space-x-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center"><CalendarDays className="h-4 w-4 mr-1" /> Joined {format(new Date(user.joinedDate), 'MMMM yyyy')}</span>
                <span className="flex items-center"><Star className="h-4 w-4 mr-1 text-yellow-400" /> {user.reputation} Reputation</span>
              </div>
            </div>
            <div className="pt-16">
              <Button variant="outline"><Edit3 className="h-4 w-4 mr-2" /> Edit Profile</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="posts">Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="activity" disabled>Activity</TabsTrigger>
          <TabsTrigger value="badges">Badges ({userBadges.length})</TabsTrigger>
          <TabsTrigger value="events" disabled>Events</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          {userPosts.length > 0 ? (
            <div className="space-y-6">
              {userPosts.map(post => (
                <PostCard key={post.id} post={post} />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {userBadges.map(badge => (
                <Badge key={badge.id} badge={badge} />
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
