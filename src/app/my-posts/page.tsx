
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Post } from '@/lib/types';
import { PostCard } from '@/components/feed/PostCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Loader2, AlertTriangle, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

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

type PostStatus = 'published' | 'draft' | 'scheduled';

export default function MyPostsPage() {
  const { user, loading: authLoading, isAuthenticated, refreshUser, router } = useAuth();
  const [postsByStatus, setPostsByStatus] = useState<Record<PostStatus, Post[]>>({
    published: [],
    draft: [],
    scheduled: [],
  });
  const [loadingStates, setLoadingStates] = useState<Record<PostStatus, boolean>>({
    published: true,
    draft: true,
    scheduled: true,
  });
  const [errorStates, setErrorStates] = useState<Record<PostStatus, string | null>>({
    published: null,
    draft: null,
    scheduled: null,
  });

  const fetchPosts = useCallback(async (status: PostStatus) => {
    if (!user || !user.id) {
      if (!authLoading) {
        setErrorStates(prev => ({ ...prev, [status]: "Please log in to view your posts." }));
        setLoadingStates(prev => ({ ...prev, [status]: false }));
      }
      return;
    }

    setLoadingStates(prev => ({ ...prev, [status]: true }));
    setErrorStates(prev => ({ ...prev, [status]: null }));

    try {
      const response = await fetch(`/api/posts?authorId=${user.id}&status=${status}&forUserId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch ${status} posts`);
      }
      const postsData: Post[] = await response.json();
      setPostsByStatus(prev => ({ ...prev, [status]: postsData }));
    } catch (e) {
      console.error(`Failed to fetch ${status} posts:`, e);
      setErrorStates(prev => ({ ...prev, [status]: e instanceof Error ? e.message : `Failed to load ${status} posts.` }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [status]: false }));
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchPosts('published');
      fetchPosts('draft');
      fetchPosts('scheduled');
    } else if (!authLoading && !isAuthenticated) {
        const msg = "Please log in to view your posts.";
        setErrorStates({ published: msg, draft: msg, scheduled: msg });
        setLoadingStates({ published: false, draft: false, scheduled: false });
    }
  }, [authLoading, isAuthenticated, fetchPosts]);


  const handlePostDeleted = (deletedPostId: string) => {
    setPostsByStatus(prev => ({
        published: prev.published.filter(p => p.id !== deletedPostId),
        draft: prev.draft.filter(p => p.id !== deletedPostId),
        scheduled: prev.scheduled.filter(p => p.id !== deletedPostId),
    }));
    refreshUser(); // Refresh user context if needed (e.g., post counts)
  };
  
  const handlePostUpdate = async () => {
    if (user && user.id) {
      await refreshUser(); 
      fetchPosts('published');
      fetchPosts('draft');
      fetchPosts('scheduled');
    }
  };


  const renderPostList = (status: PostStatus) => {
    if (loadingStates[status]) {
      return (
        <div className="space-y-6 py-6">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      );
    }
    if (errorStates[status]) {
      return (
        <div className="text-center py-10">
          <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
              <h2 className="font-semibold">Error loading {status} posts</h2>
              <p className="text-sm">{errorStates[status]}</p>
            </div>
          </div>
        </div>
      );
    }
    if (postsByStatus[status].length === 0) {
      return (
        <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <Archive className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No {status} posts found.</h2>
          {status === 'published' && <p className="text-muted-foreground">Try creating some new content!</p>}
          {status === 'draft' && <p className="text-muted-foreground">Your saved drafts will appear here.</p>}
          {status === 'scheduled' && <p className="text-muted-foreground">Posts you schedule for later will show up here.</p>}
           <Button asChild className="mt-6 btn-gradient">
            <Link href="/posts/create">Create New Post</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-6 py-6">
        {postsByStatus[status].map(post => (
          <div key={post.id} className="relative group">
            <PostCard 
                post={post} 
                onToggleBookmark={handlePostUpdate} 
                onToggleLike={handlePostUpdate}
                onPostDeleted={handlePostDeleted}
            />
            {post.status === 'scheduled' && post.scheduledAt && (
                <div className="text-xs text-center py-1 bg-blue-100 text-blue-700 border-t border-blue-200">
                    Scheduled for: {new Date(post.scheduledAt).toLocaleString()}
                </div>
            )}
             {post.status === 'draft' && (
                <div className="text-xs text-center py-1 bg-yellow-100 text-yellow-700 border-t border-yellow-200">
                    Status: Draft
                </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  

  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-48" />
        </div>
         <Skeleton className="h-10 w-full md:w-1/3 mb-6" />
        <div className="space-y-6">
          <PostSkeleton />
        </div>
      </div>
    );
  }
   if (!isAuthenticated && !authLoading) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-muted-foreground">Please log in to view your posts.</p>
        <Button onClick={() => router.push('/login?redirect=/my-posts')} className="mt-4">Login</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Archive className="mr-3 h-7 w-7" />
          My Posts
        </h1>
        <Button asChild className="btn-gradient">
          <Link href="/posts/create">Create New Post</Link>
        </Button>
      </div>

      <Tabs defaultValue="published" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="published">Published ({loadingStates.published ? '...' : postsByStatus.published.length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({loadingStates.draft ? '...' : postsByStatus.draft.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({loadingStates.scheduled ? '...' : postsByStatus.scheduled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">
          {renderPostList('published')}
        </TabsContent>
        <TabsContent value="draft">
          {renderPostList('draft')}
        </TabsContent>
        <TabsContent value="scheduled">
          {renderPostList('scheduled')}
        </TabsContent>
      </Tabs>
    </div>
  );
}

