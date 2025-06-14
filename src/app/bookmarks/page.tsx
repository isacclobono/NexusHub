
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import type { Post, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bookmark as BookmarkIcon, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

const PostSkeleton = () => (
  <div className="w-full max-w-2xl mx-auto space-y-4 p-4 border rounded-lg shadow-sm bg-card">
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-40 w-full rounded-md" />
    <div className="flex justify-between items-center pt-2">
      <div className="flex space-x-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
);

export default function BookmarksPage() {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarkedPosts = useCallback(async () => {
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

      const enrichedPosts = postsData.map(post => ({
        ...post,
        author: usersData.find(u => u.id === post.authorId) || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString() } as User,
      }));
      
      // Simulate user bookmarks - in a real app, this would come from user data
      const allBookmarked = enrichedPosts.filter(post => post.isBookmarked); 
      setBookmarkedPosts(allBookmarked);
    } catch (e) {
      console.error("Failed to fetch bookmarked posts:", e);
      setError(e instanceof Error ? e.message : 'Failed to load bookmarks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarkedPosts();
  }, [fetchBookmarkedPosts]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <BookmarkIcon className="mr-3 h-7 w-7" />
            My Bookmarks
          </h1>
        </div>
        <div className="space-y-6">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h2 className="font-semibold">Error loading bookmarks</h2>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <BookmarkIcon className="mr-3 h-7 w-7" />
          My Bookmarks
        </h1>
      </div>

      {bookmarkedPosts.length > 0 ? (
        <div className="space-y-6">
          {bookmarkedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <BookmarkIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No Bookmarks Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't bookmarked any posts. Look for the <BookmarkIcon className="inline-block h-4 w-4 align-text-bottom" /> icon on posts to save them for later.
          </p>
          <Button asChild className="btn-gradient">
            <Link href="/feed">Explore Feed</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
