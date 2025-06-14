
'use client'; // Required for useSearchParams

import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { useSearchParams } from 'next/navigation'; 
import { useEffect } from 'react'; // Import useEffect
import { useAuth } from '@/hooks/use-auth-provider'; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import toast from 'react-hot-toast'; // Import toast

export default function CreatePostPage() {
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId');
  const { isAuthenticated, loading: authLoading } = useAuth(); // Get auth state
  const router = useRouter(); // Get router instance

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to create a post.");
      // Construct the redirect query parameter
      const redirectQuery = communityId ? `?communityId=${communityId}` : '';
      router.push(`/login?redirect=${encodeURIComponent(`/posts/create${redirectQuery}`)}`);
    }
  }, [authLoading, isAuthenticated, router, communityId]);

  if (authLoading || !isAuthenticated) {
    // You can return a loader here or null if the redirect is fast enough
    return <div className="container mx-auto py-8 text-center">Loading...</div>; 
  }

  return (
    <div className="container mx-auto py-8">
      <CreatePostForm preselectedCommunityId={communityId || undefined} />
    </div>
  );
}
