'use client';

import { useState, useEffect } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import { mockPosts } from '@/lib/mock-data'; // Using mock data
import type { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bookmark as BookmarkIcon, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function BookmarksPage() {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching bookmarked posts
    setIsLoading(true);
    setTimeout(() => {
      // In a real app, filter based on actual user bookmarks
      const allBookmarked = mockPosts.filter(post => post.isBookmarked);
      setBookmarkedPosts(allBookmarked);
      setIsLoading(false);
    }, 700);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading your bookmarks...</p>
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
            <Link href="/">Explore Feed</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
