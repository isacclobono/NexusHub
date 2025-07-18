
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Post, Comment as CommentType, User, PollOption } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ThumbsUp, Bookmark, MoreHorizontal, Loader2, Send, Share2, AlertTriangle, CalendarDays, Edit, Trash2, Star, UsersRound, FileText, Video as VideoIcon, CheckSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth-provider';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { ObjectId } from 'mongodb';
import DOMPurify from 'dompurify';
import { Progress } from "@/components/ui/progress"; // For poll results
import ReportDialog from '@/components/dialogs/ReportDialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const PostPageSkeleton = () => (
  <div className="container mx-auto py-8">
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="p-6 border-b">
        <div className="flex items-center space-x-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-3/4 mb-2" /> {/* For title/poll question */}
      </CardHeader>
      <CardContent className="p-6">
        {/* For Poll Options or Content */}
        <div className="space-y-3 mb-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
        </div>
        <Skeleton className="h-48 w-full rounded-md mb-6" /> {/* For media */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t flex justify-between">
        <div className="flex space-x-4">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </CardFooter>
    </Card>
    <Card className="w-full max-w-3xl mx-auto mt-8 shadow-lg">
      <CardHeader className="p-6">
        <Skeleton className="h-7 w-1/3" />
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="flex items-start space-x-3 pt-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
        <Skeleton className="h-24 w-full mt-4" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </CardContent>
    </Card>
  </div>
);

const CommentItem = ({ comment }: { comment: CommentType }) => {
  const commentAuthor = comment.author || {
    id: comment.authorId?.toString() || 'unknown',
    _id: comment.authorId,
    name: 'Unknown User',
    avatarUrl: `https://placehold.co/40x40.png?text=${comment.author?.name?.charAt(0) || 'U'}`,
  };

  return (
    <div className="flex items-start space-x-4 py-4 border-b border-border last:border-b-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={commentAuthor.avatarUrl} alt={commentAuthor.name} data-ai-hint="profile avatar small"/>
        <AvatarFallback>{commentAuthor.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <Link href={`/profile/${commentAuthor.id}`} className="font-semibold text-sm hover:underline">
            {commentAuthor.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
          </p>
        </div>
        <p className="text-foreground/90 mt-1 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
      </div>
    </div>
  );
};


export default function PostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const { user, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const fetchPostData = useCallback(async () => {
    if (!postId) return;
    setIsLoadingPost(true);
    setError(null);
    try {
      const forUserIdQuery = user ? `?forUserId=${user.id}` : '';
      const res = await fetch(`/api/posts/${postId}${forUserIdQuery}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch post');
      }
      const postData: Post = await res.json();
      setPost({
        ...postData, 
        media: Array.isArray(postData.media) ? postData.media : [],
        pollOptions: Array.isArray(postData.pollOptions) ? postData.pollOptions : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load post.');
      setPost(null);
    } finally {
      setIsLoadingPost(false);
    }
  }, [postId, user]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const commentsData: CommentType[] = await res.json();
      setComments(commentsData);
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      fetchPostData();
      fetchComments();
    }
  }, [postId, fetchPostData, fetchComments]);

  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined' || !post?.content) return '';
    return DOMPurify.sanitize(post.content);
  }, [post?.content]);
  
  const handleToggleBookmark = async () => {
    if (!isAuthenticated || !user || !post) {
      toast.error("Please log in to bookmark posts.");
      return;
    }
    if (isBookmarking) return;
    setIsBookmarking(true);
    const originalIsBookmarked = post.isBookmarkedByCurrentUser;
    setPost(p => p ? { ...p, isBookmarkedByCurrentUser: !p.isBookmarkedByCurrentUser } : null);
    try {
      const endpoint = originalIsBookmarked ? `/api/posts/${post.id}/unbookmark` : `/api/posts/${post.id}/bookmark`;
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      toast.success(result.message);
      await refreshUser();
    } catch (err) {
      setPost(p => p ? { ...p, isBookmarkedByCurrentUser: originalIsBookmarked } : null);
      toast.error(err instanceof Error ? err.message : 'Error bookmarking.');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated || !user || !post) {
      toast.error("Please log in to like posts.");
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    const originalIsLiked = post.isLikedByCurrentUser;
    const originalLikeCount = post.likeCount;

    setPost(p => p ? {
      ...p,
      isLikedByCurrentUser: !p.isLikedByCurrentUser,
      likeCount: !p.isLikedByCurrentUser ? p.likeCount + 1 : p.likeCount - 1,
    } : null);

    try {
      const endpoint = originalIsLiked ? `/api/posts/${post.id}/like?userId=${user._id?.toString()}` : `/api/posts/${post.id}/like`;
      const response = await fetch(endpoint, {
        method: originalIsLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(originalIsLiked ? {} : { body: JSON.stringify({ userId: user._id?.toString() }) }),
      });
      const result = await response.json();
      if (!response.ok || !result.post) throw new Error(result.message);
      setPost({...result.post, media: Array.isArray(result.post.media) ? result.post.media : [], pollOptions: Array.isArray(result.post.pollOptions) ? result.post.pollOptions : undefined});
      toast.success(result.message);
    } catch (err) {
      setPost(p => p ? { ...p, isLikedByCurrentUser: originalIsLiked, likeCount: originalLikeCount } : null);
      toast.error(err instanceof Error ? err.message : 'Error liking post.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !post) {
      toast.error("Please log in to comment.");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: newComment }),
      });
      const result = await response.json();
      if (!response.ok || !result.comment) throw new Error(result.message);
      setComments(prev => [result.comment, ...prev]);
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : null);
      setNewComment('');
      toast.success("Comment added!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  const handleShare = async () => {
    if (!post) return;
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    const shareText = post.postType === 'poll' ? (post.title || 'Check out this poll!') : (post.content ? post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '') : 'Interesting content from NexusHub.');
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'NexusHub Post', text: shareText, url: postUrl });
        toast.success('Post shared!');
      } catch (err) { 
        const shareError = err as Error;
        if (shareError.name === 'AbortError') {
            console.log('Share action cancelled by user.');
        } else if (shareError.name === 'NotAllowedError') {
             console.warn('Web Share API permission denied:', shareError);
             toast('Sharing via system dialog failed. Trying to copy link...');
             await navigator.clipboard.writeText(postUrl).then(() => toast.success('Post link copied to clipboard!')).catch(() => toast.error('Could not copy link.'));
        } else {
            console.error('Share API error:', err); 
            toast.error('Could not share post.'); 
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        toast.success('Post link copied to clipboard!');
      } catch (err) { console.error('Clipboard API error:', err); toast.error('Could not copy link.'); }
    }
  };

  const handleDeletePost = async () => {
    if (!post || !user || user.id !== post.author?.id) return;
    setIsDeletingPost(true);
    try {
      const response = await fetch(`/api/posts/${post.id}?userId=${user.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || "Failed to delete post.");
      toast.success(`Post "${post.title || 'Post'}" deleted.`);
      router.push('/feed'); 
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete post.");
    } finally {
      setIsDeletingPost(false);
      setShowDeleteDialog(false);
    }
  };

  const handleVote = async (optionId: string | ObjectId) => {
    if (!isAuthenticated || !user || !post || !post.id) {
      toast.error("Please log in to vote.");
      return;
    }
    if (isVoting || post.userVotedOptionId) {
      toast.info(post.userVotedOptionId ? "You have already voted in this poll." : "Processing previous vote...");
      return;
    }
    setIsVoting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, optionId: typeof optionId === 'string' ? optionId : optionId.toString() }),
      });
      const result = await response.json();
      if (!response.ok || !result.post) {
        throw new Error(result.message || "Failed to record vote.");
      }
      setPost({ // Update local post state with new poll data
        ...result.post, 
        media: Array.isArray(result.post.media) ? result.post.media : [],
        pollOptions: Array.isArray(result.post.pollOptions) ? result.post.pollOptions : undefined,
      });
      toast.success("Your vote has been recorded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record vote.");
    } finally {
      setIsVoting(false);
    }
  };


  if (authLoading || isLoadingPost) return <PostPageSkeleton />;
  if (error) return <div className="container mx-auto py-8 text-center text-destructive"><AlertTriangle className="inline-block mr-2"/>{error}</div>;
  if (!post) return <div className="container mx-auto py-8 text-center">Post not found.</div>;

  const canCurrentUserManagePost = isAuthenticated && user && user.id === post.author?.id;

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <Card className="w-full max-w-3xl mx-auto shadow-xl rounded-lg">
        <CardHeader className="p-4 md:p-6 border-b">
          <div className="flex items-start space-x-3">
            <Link href={`/profile/${post.author.id}`} className="flex-shrink-0">
              <Avatar className="h-11 w-11 md:h-12 md:w-12">
                <AvatarImage src={post.author.avatarUrl || `https://placehold.co/48x48.png`} alt={post.author.name} data-ai-hint="profile avatar"/>
                <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-grow">
              <Link href={`/profile/${post.author.id}`} className="font-semibold text-md md:text-lg font-headline hover:underline">
                {post.author.name}
              </Link>
              <div className="text-xs text-muted-foreground flex items-center flex-wrap">
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                {post.author.reputation !== undefined && <span className="mx-1">·</span>}
                {post.author.reputation !== undefined && <span className="flex items-center"><Star className="h-3 w-3 mr-0.5 text-yellow-400 fill-current" /> {post.author.reputation}</span>}
                {post.category && <span className="mx-1">·</span>}
                {post.category && <span>{post.category}</span>}
                {post.communityName && post.communityId && <span className="mx-1">·</span>}
                {post.communityName && post.communityId && (
                  <span className="flex items-center">
                    <UsersRound className="h-3 w-3 mr-1" />
                    <Link href={`/communities/${post.communityId.toString()}`} className="hover:underline text-primary">
                      {post.communityName}
                    </Link>
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="More options">
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground hover:text-primary" />
                            <span className="sr-only">More options</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share Post</DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setShowReportDialog(true)} disabled={!isAuthenticated}>
                            <Flag className="mr-2 h-4 w-4" /> Report Post
                        </DropdownMenuItem>
                        {canCurrentUserManagePost && (
                        <>
                            <DropdownMenuItem asChild><Link href={`/posts/${post.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit Post</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                            </DropdownMenuItem>
                        </>
                        )}
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
          </div>
          {post.title && <CardTitle className="text-2xl md:text-3xl mt-4 font-headline text-primary">{post.title}</CardTitle>}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {post.postType !== 'poll' && post.content && (
            <div 
              className="prose dark:prose-invert max-w-none break-words mb-6 text-foreground/90"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}

          {post.postType === 'poll' && post.pollOptions && (
            <div className="space-y-3 mb-6">
              {post.pollOptions.map((option) => {
                const votePercentage = post.totalVotes && post.totalVotes > 0 ? (option.votes / post.totalVotes) * 100 : 0;
                const isVotedByUser = post.userVotedOptionId === option.id || (option._id && post.userVotedOptionId === option._id.toString());
                return (
                  <div key={option.id || option._id?.toString()} className="space-y-1.5">
                    <Button
                      variant={isVotedByUser ? "default" : "outline"}
                      className={`w-full justify-start text-left h-auto py-2.5 px-3 ${isVotedByUser ? 'border-primary ring-2 ring-primary' : ''}`}
                      onClick={() => handleVote(option.id || option._id!)}
                      disabled={isVoting || !!post.userVotedOptionId || !isAuthenticated}
                    >
                      <span className="flex-1">{option.optionText}</span>
                      {!!post.userVotedOptionId && ( // Show votes only if user has voted or poll ended (not implemented)
                        <span className="text-xs text-muted-foreground ml-2">{option.votes} vote{option.votes !== 1 ? 's' : ''} ({votePercentage.toFixed(0)}%)</span>
                      )}
                    </Button>
                    {!!post.userVotedOptionId && (
                      <Progress value={votePercentage} className="h-2" />
                    )}
                  </div>
                );
              })}
              {post.totalVotes !== undefined && post.userVotedOptionId && (
                 <p className="text-sm text-muted-foreground mt-2 text-right">{post.totalVotes} total vote{post.totalVotes !== 1 ? 's' : ''}</p>
              )}
              {!post.userVotedOptionId && isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-1">Click an option to cast your vote.</p>
              )}
               {!isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-1">Please <Link href={`/login?redirect=/posts/${post.id}`} className="underline text-primary">log in</Link> to vote.</p>
              )}
            </div>
          )}


          {post.media && post.media.length > 0 && (
            <div className="space-y-4 mb-6">
              {post.media.map((item, index) => (
                <div key={index} className="rounded-lg overflow-hidden border shadow-sm">
                  {item.type === 'image' && (
                    <div className="relative aspect-video">
                        <Image src={item.url} alt={item.name || post.title || `Post media ${index + 1}`} layout="fill" objectFit="contain" data-ai-hint="post media content"/>
                    </div>
                  )}
                  {item.type === 'video' && (
                     <video controls src={item.url} className="w-full max-h-[500px] aspect-video bg-black" title={item.name || post.title || `Video ${index+1}`}/>
                  )}
                  {item.type === 'document' && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 p-3 bg-muted hover:bg-muted/80 transition-colors">
                      <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground truncate" title={item.name || `Document ${index+1}`}>
                        {item.name || `Document ${index+1}`}
                      </span>
                      <span className="text-xs text-primary ml-auto hover:underline">View/Download</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link href={`/tags/${tag}`} key={tag} className="text-xs bg-secondary hover:bg-muted text-secondary-foreground px-2.5 py-1 rounded-full transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 md:p-6 border-t flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="sm" onClick={handleToggleLike} disabled={isLiking || !isAuthenticated} className={`flex items-center ${post.isLikedByCurrentUser ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
              {isLiking ? <Loader2 className="h-5 w-5 animate-spin mr-1" /> : <ThumbsUp className="h-5 w-5 mr-1" />} {post.likeCount}
            </Button>
            <div className="flex items-center text-muted-foreground">
              <MessageCircle className="h-5 w-5 mr-1" /> {post.commentCount}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleToggleBookmark} disabled={isBookmarking || !isAuthenticated} className={`${post.isBookmarkedByCurrentUser ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}>
            {isBookmarking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bookmark className="h-5 w-5" />}
             <span className="sr-only">{post.isBookmarkedByCurrentUser ? 'Unbookmark' : 'Bookmark'}</span>
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-3xl mx-auto mt-8 shadow-lg rounded-lg" id="comments">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl font-headline">Comments ({post.commentCount || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isAuthenticated && (
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex items-start space-x-3">
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarImage src={user?.avatarUrl || `https://placehold.co/40x40.png`} alt={user?.name} data-ai-hint="profile avatar comment"/>
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] text-sm"
                    disabled={isSubmittingComment}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" size="sm" disabled={isSubmittingComment || !newComment.trim()} className="btn-gradient">
                      {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                      {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
          {isLoadingComments && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
          {!isLoadingComments && comments.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
          )}
          {!isLoadingComments && comments.length > 0 && (
            <div className="space-y-2">
              {comments.map(comment => (
                <CommentItem key={comment.id || comment._id?.toString()} comment={comment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post titled "<strong>{post.title || 'this post'}</strong>" and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPost}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={isDeletingPost} className="bg-destructive hover:bg-destructive/90">
              {isDeletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showReportDialog && user && post.id && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          itemId={post.id}
          itemType="post"
          reporterUserId={user.id!}
        />
      )}
    </div>
  );
}
