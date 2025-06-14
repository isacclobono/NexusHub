
import type { Post, Comment as CommentType, User } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ThumbsUp, Bookmark, MoreHorizontal, FileText, Video, Image as ImageIcon, Loader2, Send, Share2, Trash2, Edit, SendHorizonal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth-provider';
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import type { ObjectId } from 'mongodb';
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

interface PostCardProps {
  post: Post;
  onToggleBookmark?: (postId: string, isCurrentlyBookmarked: boolean) => Promise<void> | void;
  onToggleLike?: (postId: string, isCurrentlyLiked: boolean, updatedPost: Post) => Promise<void> | void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: Post) => void; // For status changes like publishing a draft
}


const CommentItem = ({ comment }: { comment: CommentType }) => {
  const commentAuthor = comment.author || {
    id: comment.authorId?.toString() || 'unknown',
    _id: comment.authorId,
    name: 'Unknown User',
    avatarUrl: undefined,
    email: '',
    reputation: 0,
    joinedDate: new Date().toISOString(),
    bookmarkedPostIds: []
  };

  return (
    <div className="flex items-start space-x-3 pt-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={commentAuthor.avatarUrl || `https://placehold.co/32x32.png`} alt={commentAuthor.name} data-ai-hint="profile avatar small"/>
        <AvatarFallback>{commentAuthor.name ? commentAuthor.name.charAt(0) : 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 text-sm bg-muted/50 p-2.5 rounded-md">
        <div className="flex items-center justify-between">
            <Link href={`/profile/${commentAuthor.id}`} className="font-semibold hover:underline text-foreground">
                {commentAuthor.name}
            </Link>
            <p className="text-xs text-muted-foreground">
                {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
            </p>
        </div>
        <p className="text-foreground/90 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
      </div>
    </div>
  );
};

export function PostCard({ post: initialPost, onToggleBookmark: onToggleBookmarkProp, onToggleLike: onToggleLikeProp, onPostDeleted, onPostUpdated }: PostCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState<Post>(initialPost);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);


  useEffect(() => {
    setPost(prevPost => ({
      ...initialPost,
      comments: Array.isArray(initialPost.comments) ? initialPost.comments : [],
      likedBy: Array.isArray(initialPost.likedBy) ? initialPost.likedBy : [],
      commentIds: Array.isArray(initialPost.commentIds) ? initialPost.commentIds : [],
    }));
  }, [initialPost]);


  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isBookmarkedByCurrentUser = isAuthenticated && user && post.id && Array.isArray(user.bookmarkedPostIds) ?
    user.bookmarkedPostIds.some(id => id.toString() === (post._id! as ObjectId | string).toString()) : false;

  const isLikedByCurrentUser = isAuthenticated && user && post.id && Array.isArray(post.likedBy) && user._id ?
    post.likedBy.some(likedById => likedById.toString() === user._id!.toString()) : false;

  const canCurrentUserManagePost = isAuthenticated && user && user.id === post.author?.id;

  const { author: postAuthorData, title, content, media, category, tags, createdAt } = post;
  const postComments = post.comments || [];
  const commentCount = post.commentCount || 0;

  const postAuthor = postAuthorData || {
    id: post.authorId?.toString() || 'unknown',
    _id: post.authorId,
    name: 'Unknown User',
    avatarUrl: undefined,
    reputation: 0,
    joinedDate: new Date().toISOString(),
    email: '',
    bookmarkedPostIds: []
  };

  const displayComments = Array.isArray(postComments) ? postComments.slice(0, 2) : [];

  const handleToggleBookmark = async () => {
    if (!isAuthenticated || !user || !user.id || !post.id) {
      toast.error("Please log in to bookmark posts.");
      return;
    }
    if (isBookmarking) return;

    setIsBookmarking(true);
    const currentlyBookmarked = isBookmarkedByCurrentUser;

    setPost(prevPost => ({...prevPost, isBookmarkedByCurrentUser: !currentlyBookmarked}));


    try {
      const endpoint = currentlyBookmarked ? `/api/posts/${post.id}/unbookmark` : `/api/posts/${post.id}/bookmark`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        setPost(prevPost => ({...prevPost, isBookmarkedByCurrentUser: currentlyBookmarked}));
        throw new Error(result.message || `Failed to ${currentlyBookmarked ? 'unbookmark' : 'bookmark'} post.`);
      }
      toast.success(result.message || `Post ${currentlyBookmarked ? 'unbookmarked' : 'bookmarked'}!`);
      if (onToggleBookmarkProp) {
        onToggleBookmarkProp(post.id, !currentlyBookmarked);
      }

    } catch (err) {
      setPost(prevPost => ({...prevPost, isBookmarkedByCurrentUser: currentlyBookmarked}));
      toast.error(err instanceof Error ? err.message : 'An error occurred.');
      console.error("Bookmark error:", err);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated || !user || !user._id || !post.id) {
      toast.error("Please log in to like posts.");
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    const currentlyLiked = isLikedByCurrentUser;
    const originalLikeCount = post.likeCount || 0;
    const originalLikedBy = Array.isArray(post.likedBy) ? [...post.likedBy] : [];

    setPost(prevPost => ({
      ...prevPost,
      likeCount: currentlyLiked ? (prevPost.likeCount || 0) - 1 : (prevPost.likeCount || 0) + 1,
      likedBy: currentlyLiked
        ? (Array.isArray(prevPost.likedBy) ? prevPost.likedBy.filter(id => id.toString() !== user._id!.toString()) : [])
        : [...(Array.isArray(prevPost.likedBy) ? prevPost.likedBy : []), user._id! as ObjectId],
      isLikedByCurrentUser: !currentlyLiked
    }));

    try {
      const endpoint = currentlyLiked ? `/api/posts/${post.id}/like?userId=${user._id.toString()}` : `/api/posts/${post.id}/like`;
      const response = await fetch(
        endpoint,
        {
          method: currentlyLiked ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(currentlyLiked ? {} : { body: JSON.stringify({ userId: user._id.toString() }) }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.post) {
        setPost(prevPost => ({
          ...prevPost,
          likeCount: originalLikeCount,
          likedBy: originalLikedBy,
          isLikedByCurrentUser: currentlyLiked
        }));
        throw new Error(result.message || `Failed to ${currentlyLiked ? 'unlike' : 'like'} post.`);
      }

      const updatedPostFromServer = {
        ...result.post,
        comments: Array.isArray(result.post.comments) ? result.post.comments : [],
        likedBy: Array.isArray(result.post.likedBy) ? result.post.likedBy : [],
      };
      setPost(updatedPostFromServer);

      toast.success(result.message || `Post ${currentlyLiked ? 'unliked' : 'liked'}!`);
      if (onToggleLikeProp) {
        onToggleLikeProp(post.id, !currentlyLiked, updatedPostFromServer);
      }

    } catch (err) {
        setPost(prevPost => ({
          ...prevPost,
          likeCount: originalLikeCount,
          likedBy: originalLikedBy,
          isLikedByCurrentUser: currentlyLiked
        }));
      toast.error(err instanceof Error ? err.message : 'An error occurred during like/unlike.');
      console.error("Like/Unlike error:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated || !user || !user.id || !post.id) {
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
      if (!response.ok || !result.comment) {
        throw new Error(result.message || "Failed to add comment.");
      }

      const newCommentFromApi: CommentType = result.comment;

      setPost(prevPost => ({
        ...prevPost,
        comments: [newCommentFromApi, ...(prevPost.comments || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        commentCount: (prevPost.commentCount || 0) + 1,
        commentIds: [...(prevPost.commentIds || []), newCommentFromApi._id!]
      }));
      setNewComment('');
      toast.success("Comment added!");

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add comment.");
      console.error("Comment submission error:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    const shareData = {
      title: post.title || 'Check out this post on NexusHub!',
      text: post.content ? post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '') : 'Interesting content from NexusHub.',
      url: postUrl,
    };

    let sharedViaApi = false;
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Post shared successfully!');
        sharedViaApi = true; 
        return; 
      } catch (err) {
        const shareError = err as Error;
        if (shareError.name === 'AbortError') {
          console.log('Share action cancelled by user.');
          sharedViaApi = true; 
          return; 
        } else if (shareError.name === 'NotAllowedError') {
          console.warn('Web Share API permission denied:', shareError);
          toast.info('Sharing via system dialog failed. Trying to copy link...');
        } else {
          console.error('Web Share API error:', shareError);
          toast.error('Could not share using system dialog. Trying to copy link...');
        }
      }
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Post link copied to clipboard!');
    } catch (copyError) {
      console.error('Clipboard API error:', copyError);
      if (!navigator.share || !sharedViaApi) {
          toast.error('Could not copy link to clipboard.');
      }
    }
  };

  const handleDeletePost = async () => {
    if (!canCurrentUserManagePost || !post.id) {
      toast.error("You are not authorized to delete this post or post ID is missing.");
      return;
    }
    setIsDeletingPost(true);
    try {
      const response = await fetch(`/api/posts/${post.id}?userId=${user!.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete post.");
      }
      toast.success(`Post "${post.title || 'Post'}" deleted successfully.`);
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete post.");
      console.error("Delete post error:", err);
    } finally {
      setIsDeletingPost(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!canCurrentUserManagePost || !post.id || post.status !== 'draft') {
      toast.error("Cannot publish this post.");
      return;
    }
    setIsPublishingDraft(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, status: 'published' }),
      });
      const result = await response.json();
      if (!response.ok || !result.id) { // Check for result.id as GET returns the full post
        throw new Error(result.message || "Failed to publish draft.");
      }
      toast.success(`Draft "${result.title || 'Post'}" published successfully!`);
      if (onPostUpdated) {
        onPostUpdated(result as Post);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish draft.");
      console.error("Publish draft error:", err);
    } finally {
      setIsPublishingDraft(false);
    }
  };


  return (
    <>
    <Card className="w-full max-w-2xl mx-auto shadow-subtle hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${postAuthor.id}`} className="flex items-center space-x-3 group">
            <Avatar className="h-10 w-10">
              <AvatarImage src={postAuthor.avatarUrl || `https://placehold.co/40x40.png`} alt={postAuthor.name} data-ai-hint="profile avatar" />
              <AvatarFallback>{postAuthor.name ? postAuthor.name.charAt(0) : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm font-headline group-hover:underline">{postAuthor.name}</p>
              <p className="text-xs text-muted-foreground">
                {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : 'Recently'}
                {category && ` · ${category}`}
                 {post.communityName && (
                    <>
                        {' in '}
                        <Link href={`/communities/${post.communityId}`} className="text-primary hover:underline">
                            {post.communityName}
                        </Link>
                    </>
                )}
              </p>
            </div>
          </Link>
          <div className="ml-auto">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="More options">
                        <MoreHorizontal className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        <span className="sr-only">More options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleShare} disabled={isDeletingPost || isPublishingDraft}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </DropdownMenuItem>
                    {canCurrentUserManagePost && (
                      <>
                        <DropdownMenuItem onClick={() => toast.info("Edit post feature coming soon!")} disabled={isDeletingPost || isPublishingDraft}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Post
                        </DropdownMenuItem>
                        {post.status === 'draft' && (
                          <DropdownMenuItem onClick={handlePublishDraft} disabled={isPublishingDraft || isDeletingPost}>
                            {isPublishingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
                            Publish Draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive" disabled={isDeletingPost || isPublishingDraft}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                        </DropdownMenuItem>
                      </>
                    )}
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {title && <CardTitle className="text-xl mb-2 font-headline"><Link href={`/posts/${post.id}`}>{title}</Link></CardTitle>}
        <p className="text-foreground whitespace-pre-wrap break-words mb-3">{content.substring(0, 300)}{content.length > 300 && '...'}</p>
        {content.length > 300 && post.id && (
          <Button variant="link" asChild className="p-0 h-auto text-sm">
            <Link href={`/posts/${post.id}`}>Read more</Link>
          </Button>
        )}
        {media && Array.isArray(media) && media.length > 0 && (
          <div className={`grid gap-2 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} mb-3`}>
            {media.map((item, index) => (
              <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                {item.type === 'image' && (
                   <Image src={item.url} alt={item.name || title || `Post media ${index + 1}`} layout="fill" objectFit="cover" data-ai-hint="social media content" />
                )}
                 {(item.type === 'video' || item.type === 'document') && (
                    <div className="flex flex-col items-center justify-center h-full bg-muted">
                       {item.type === 'video' && <Video className="h-8 w-8 text-muted-foreground" />}
                       {item.type === 'document' && <FileText className="h-8 w-8 text-muted-foreground" />}
                      <span className="mt-2 text-sm text-muted-foreground">{item.name || item.type}</span>
                    </div>
                 )}
              </div>
            ))}
          </div>
        )}
        {tags && Array.isArray(tags) && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map(tag => (
              <Link href={`/tags/${tag}`} key={tag} className="text-xs bg-secondary hover:bg-muted text-secondary-foreground px-2 py-1 rounded-full transition-colors">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {(displayComments.length > 0 || (commentCount || 0) > 2) && (
          <div className="mt-4 pt-4 border-t">
            {displayComments.length > 0 && <h4 className="text-sm font-semibold text-muted-foreground mb-1">Comments:</h4>}
            <div className="space-y-2">
              {displayComments.map(comment => (
                <CommentItem key={comment.id || comment._id?.toString()} comment={comment} />
              ))}
            </div>
            {(commentCount || 0) > displayComments.length && post.id && (
              <Button variant="link" asChild className="text-xs p-0 h-auto mt-2">
                <Link href={`/posts/${post.id}`}>View all {commentCount} comments</Link>
              </Button>
            )}
          </div>
        )}

        {isAuthenticated && (
            <form onSubmit={handleCommentSubmit} className="mt-4 pt-4 border-t">
                <div className="flex items-start space-x-3">
                    <Avatar className="h-9 w-9 mt-1">
                        <AvatarImage src={user?.avatarUrl || `https://placehold.co/36x36.png`} alt={user?.name} data-ai-hint="profile avatar comment"/>
                        <AvatarFallback>{user?.name ? user.name.charAt(0) : 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[60px] text-sm"
                            disabled={isSubmittingComment}
                        />
                        <div className="mt-2 flex justify-end">
                            <Button type="submit" size="sm" disabled={isSubmittingComment || !newComment.trim()} className="btn-gradient">
                                {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                                {isSubmittingComment ? 'Sending...' : 'Comment'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        )}

      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLike}
            disabled={isLiking || !isAuthenticated}
            className={`text-muted-foreground hover:text-primary ${isLikedByCurrentUser ? 'text-primary' : ''}`}
          >
            {isLiking ? <Loader2 className="h-5 w-5 mr-1 animate-spin" /> : <ThumbsUp className="h-5 w-5 mr-1" />}
             {(post.likeCount || 0) > 0 ? post.likeCount : 'Like'}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <MessageCircle className="h-5 w-5 mr-1" /> {commentCount || 0}
          </Button>
        </div>
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleBookmark}
            disabled={isBookmarking || !isAuthenticated}
            className={`text-muted-foreground ${isBookmarkedByCurrentUser ? 'text-accent' : 'hover:text-accent'}`}
            title={isBookmarkedByCurrentUser ? 'Unbookmark' : 'Bookmark'}
        >
          {isBookmarking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bookmark className="h-5 w-5" />}
          <span className="sr-only">{isBookmarkedByCurrentUser ? 'Unbookmark' : 'Bookmark'}</span>
        </Button>
      </CardFooter>
    </Card>
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post titled "<strong>{post.title || 'this post'}</strong>".
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
    </>
  );
}
