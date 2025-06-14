
'use client';

import { EditPostForm } from '@/components/feed/EditPostForm';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-provider';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import type { Post } from '@/lib/types';
import { Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to edit a post.");
      router.push(`/login?redirect=/posts/${postId}/edit`);
      return;
    }

    if (postId && isAuthenticated && user) {
      setIsLoadingPost(true);
      setError(null);
      fetch(`/api/posts/${postId}?forUserId=${user.id}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to fetch post: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: Post) => {
          if (data.authorId.toString() !== user.id) {
            toast.error("You are not authorized to edit this post.");
            router.push(`/posts/${postId}`);
            throw new Error("Unauthorized to edit.");
          }
          setPost(data);
        })
        .catch((err) => {
          if (!(err instanceof Error && err.message === "Unauthorized to edit.")) {
            setError(err.message || 'Could not load post data.');
            console.error("Fetch post error:", err);
          }
        })
        .finally(() => setIsLoadingPost(false));
    } else if (!postId && !authLoading) {
        setError("Post ID is missing.");
        setIsLoadingPost(false);
    }

  }, [postId, authLoading, isAuthenticated, user, router]);


  if (authLoading || isLoadingPost) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
         <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h2 className="font-semibold">Error loading post for editing</h2>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto py-8 text-center">
         <div className="flex items-center justify-center bg-muted/50 text-muted-foreground border border-dashed p-8 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="h-10 w-10 mr-4" />
          <div>
            <h2 className="text-xl font-semibold">Post Not Found</h2>
            <p>The post you are trying to edit does not exist or could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <EditPostForm existingPost={post} />
    </div>
  );
}

    