
'use client'; // Required for useSearchParams

import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

export default function CreatePostPage() {
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId');

  return (
    <div className="container mx-auto py-8">
      <CreatePostForm preselectedCommunityId={communityId || undefined} />
    </div>
  );
}
