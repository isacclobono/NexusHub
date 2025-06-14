
'use client';

import { PostCard } from '@/components/feed/PostCard';
import { mockPosts } from '@/lib/mock-data';
import type { Post } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquarePlus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { personalizeFeed, PersonalizeFeedInput } from '@/ai/flows/personalized-feed-curation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurating, setIsCurating] = useState(false);
  const [curationReasoning, setCurationReasoning] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Simulate fetching posts
    setTimeout(() => {
      setPosts(mockPosts.filter(p => p.status === 'published'));
      setIsLoading(false);
    }, 1000);
  }, []);

  const handlePersonalizeFeed = async () => {
    if (!user) {
      // Handle case where user is not available
      return;
    }
    setIsCurating(true);
    setCurationReasoning(null);
    try {
      // Example user history and available posts (in a real app, this would be dynamic)
      const userHistory = `User ${user.name} has shown interest in AI, technology, and community gardening. They recently viewed posts about machine learning and local volunteering.`;
      const availablePostsSummary = mockPosts
        .filter(p => p.status === 'published')
        .map(p => `Title: ${p.title || 'Untitled Post'}\nDescription: ${p.content.substring(0,100)}...\nTags: ${p.tags?.join(', ')}\nCategory: ${p.category}`)
        .join('\n\n');
      
      const input: PersonalizeFeedInput = {
        userHistory,
        availablePosts: availablePostsSummary,
      };
      
      const result = await personalizeFeed(input);
      
      // Filter and reorder posts based on AI curation (simplified)
      const curatedTitles = result.curatedFeed.split('\n').map(t => t.trim()).filter(Boolean);
      const curatedPosts = curatedTitles.map(title => mockPosts.find(p => p.title === title || p.content.startsWith(title.substring(0,20)))).filter(Boolean) as Post[];
      const otherPosts = mockPosts.filter(p => p.status === 'published' && !curatedPosts.some(cp => cp.id === p.id));
      
      setPosts([...curatedPosts, ...otherPosts]);
      setCurationReasoning(result.reasoning);

    } catch (error) {
      console.error("Error personalizing feed:", error);
      // Handle error (e.g., show a toast message)
    } finally {
      setIsCurating(false);
    }
  };


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

      {isLoading ? (
        <div className="space-y-6">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Image src="https://placehold.co/300x200.png" alt="Empty feed" data-ai-hint="empty state illustration" width={300} height={200} className="mx-auto mb-4 opacity-70" />
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
