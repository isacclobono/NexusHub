
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersRound, PlusCircle, Loader2, AlertTriangle, Users, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const CommunityCardSkeleton = () => (
  <Card className="overflow-hidden shadow-sm">
    <Skeleton className="h-32 w-full" />
    <CardHeader className="p-4">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </CardContent>
    <CardFooter className="p-4 border-t">
      <Skeleton className="h-9 w-full" />
    </CardFooter>
  </Card>
);

const CommunityCard = ({ community }: { community: Community }) => (
  <Card className="overflow-hidden shadow-subtle hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col">
    <Link href={`/communities/${community.id}`} className="block relative h-40 w-full group">
      <Image 
        src={community.coverImageUrl || `https://placehold.co/800x300.png?text=${encodeURIComponent(community.name)}`} 
        alt={community.name} 
        layout="fill" 
        objectFit="cover"
        data-ai-hint="community banner group"
        className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-75 group-hover:opacity-100 transition-opacity"></div>
    </Link>
    <CardHeader className="p-4 relative z-10 -mt-10">
      <div className="flex justify-between items-start">
        <CardTitle className="font-headline text-lg text-white group-hover:text-primary transition-colors shadow-text">
          <Link href={`/communities/${community.id}`}>{community.name}</Link>
        </CardTitle>
        <Badge variant={community.privacy === 'public' ? 'secondary' : 'outline'} className="text-xs capitalize bg-background/80 backdrop-blur-sm">
          {community.privacy}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-2 flex-grow">
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{community.description}</p>
      <div className="text-xs text-muted-foreground flex items-center">
        <Users className="h-3.5 w-3.5 mr-1.5" /> {community.memberCount || 0} members
      </div>
      {community.creator && (
        <p className="text-xs text-muted-foreground mt-1">
          Created by <Link href={`/profile/${community.creator.id}`} className="text-primary hover:underline">{community.creator.name}</Link>
        </p>
      )}
    </CardContent>
    <CardFooter className="p-4 border-t">
      <Button asChild size="sm" className="w-full btn-gradient">
        <Link href={`/communities/${community.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          View Community
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/communities');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch communities: ${response.statusText}`);
      }
      const communitiesData: Community[] = await response.json();
      setCommunities(communitiesData);
    } catch (e) {
      console.error("Failed to fetch communities data:", e);
      setError(e instanceof Error ? e.message : "Failed to load communities.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <UsersRound className="mr-3 h-8 w-8" /> Community Hub
        </h1>
        <Button asChild className="btn-gradient">
          <Link href="/communities/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Community
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <CommunityCardSkeleton key={i} />)}
        </div>
      )}
      {!isLoading && error && (
        <div className="text-center py-10">
            <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
                <h2 className="font-semibold">Error loading communities</h2>
                <p className="text-sm">{error}</p>
            </div>
            </div>
        </div>
      )}
      {!isLoading && !error && communities.length === 0 && (
         <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <UsersRound className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No Communities Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Be the first to create a community and start connecting!
          </p>
          <Button asChild className="btn-gradient">
            <Link href="/communities/create">Create a Community</Link>
          </Button>
        </div>
      )}
      {!isLoading && !error && communities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map(community => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}
    </div>
  );
}
