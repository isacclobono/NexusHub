
'use client';

import { PostCard } from '@/components/feed/PostCard';
import type { Post, User } from '@/lib/types';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquarePlus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { personalizeFeed, PersonalizeFeedInput } from '@/ai/flows/personalized-feed-curation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image'; // Added for empty state image

const PostSkeleton = () => (
  <div className="w-full max-w-2xl mx-auto space-y-4 p-4 border rounded-lg shadow-sm bg-card">
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-5 w-3/4" /> {/* Title */}
    <Skeleton className="h-16 w-full" /> {/* Content */}
    <Skeleton className="h-40 w-full rounded-md" /> {/* Image placeholder */}
    <div className="flex justify-between items-center pt-2">
      <div className="flex space-x-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
);


export default function FeedPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]); // Store all fetched posts
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]); // Posts to render
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users
  const [isLoading, setIsLoading] = useState(true);
  const [isCurating, setIsCurating] = useState(false);
  const [curationReasoning, setCurationReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [postsResponse, usersResponse] = await Promise.all([
        fetch('/api/data/posts.json'),
        fetch('/api/data/users.json')
      ]);

      if (!postsResponse.ok) throw new Error(`Failed to fetch posts: ${postsResponse.statusText}`);
      if (!usersResponse.ok) throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
      
      const postsData: Post[] = await postsResponse.json();
      const usersData: User[] = await usersResponse.json();
      setAllUsers(usersData);

      // Enrich posts with author data
      const enrichedPosts = postsData.map(post => ({
        ...post,
        author: usersData.find(u => u.id === post.authorId) || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString() } as User,
      }));
      
      setAllPosts(enrichedPosts);
      setDisplayedPosts(enrichedPosts.filter(p => p.status === 'published'));

    } catch (e) {
      console.error("Error fetching feed data:", e);
      setError(e instanceof Error ? e.message : "Failed to load feed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePersonalizeFeed = async () => {
    if (!user || allPosts.length === 0) {
      return;
    }
    setIsCurating(true);
    setCurationReasoning(null);
    try {
      const userHistory = `User ${user.name} has shown interest in AI, technology, and community gardening. They recently viewed posts about machine learning and local volunteering.`;
      const availablePostsSummary = allPosts
        .filter(p => p.status === 'published')
        .map(p => `Title: ${p.title || 'Untitled Post'}\nDescription: ${p.content.substring(0,100)}...\nTags: ${p.tags?.join(', ')}\nCategory: ${p.category}`)
        .join('\n\n');
      
      const input: PersonalizeFeedInput = {
        userHistory,
        availablePosts: availablePostsSummary,
      };
      
      const result = await personalizeFeed(input);
      
      const curatedTitles = result.curatedFeed.split('\n').map(t => t.trim().toLowerCase()).filter(Boolean);
      
      const curatedPosts = allPosts.filter(p => 
        p.status === 'published' && 
        (p.title && curatedTitles.includes(p.title.toLowerCase())) || 
        curatedTitles.some(ct => p.content.toLowerCase().startsWith(ct.substring(0,20)))
      );
      
      const otherPosts = allPosts.filter(p => p.status === 'published' && !curatedPosts.some(cp => cp.id === p.id));
      
      setDisplayedPosts([...curatedPosts, ...otherPosts]);
      setCurationReasoning(result.reasoning);

    } catch (error) {
      console.error("Error personalizing feed:", error);
      // Handle error (e.g., show a toast message)
    } finally {
      setIsCurating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-4">
          <Skeleton className="h-9 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-destructive">
        Error loading feed: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Community Feed</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePersonalizeFeed} disabled={isCurating || !user}>
            {isCurating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SlidersHorizontal className="mr-2 h-4 w-4" />}
            {isCurating ? 'Curating...' : 'Personalize My Feed'}
          </Button>
          <Link href="/posts/create" passHref>
            <Button className="btn-gradient">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>
      </div>

      {curationReasoning && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent-foreground">
          <p className="font-semibold mb-1">Feed Curation Notes:</p>
          <p>{curationReasoning}</p>
        </div>
      )}

      {displayedPosts.length > 0 ? (
        <div className="space-y-6">
          {displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Image src="https://placehold.co/300x200.png" alt="Empty feed" data-ai-hint="empty state illustration" width={300} height={200} className="mx-auto mb-4 opacity-70 rounded-lg" />
          <h2 className="text-2xl font-semibold mb-2">It's a bit quiet here...</h2>
          <p className="text-muted-foreground mb-4">Be the first to share something amazing with the community!</p>
          <Link href="/posts/create" passHref>
            <Button size="lg" className="btn-gradient">Create Your First Post</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
