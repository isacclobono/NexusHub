
import type { Post, Comment as CommentType, User } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ThumbsUp, Bookmark, MoreHorizontal, FileText, Video, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  allUsers?: User[]; // Kept for potential future use if comments are not pre-enriched
}

const ReactionDisplay = ({ reactions }: { reactions: Post['reactions'] }) => (
  <div className="flex items-center space-x-2">
    {reactions.slice(0, 3).map((reaction, index) => (
      <div key={index} className="flex items-center text-sm text-muted-foreground">
        <span className="mr-1 text-lg">{reaction.emoji}</span>
        <span>{reaction.count}</span>
      </div>
    ))}
    {reactions.length > 3 && (
      <span className="text-sm text-muted-foreground">+{reactions.length - 3} more</span>
    )}
  </div>
);

const MediaIcon = ({ type }: { type: 'image' | 'video' | 'document' }) => {
  if (type === 'video') return <Video className="h-4 w-4 text-muted-foreground" />;
  if (type === 'document') return <FileText className="h-4 w-4 text-muted-foreground" />;
  return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
};

const CommentItem = ({ comment }: { comment: CommentType }) => {
  // Assuming comment.author is now pre-enriched by the API
  const commentAuthor = comment.author || { id: 'unknown', name: 'Unknown User', avatarUrl: undefined, email: '', reputation: 0, joinedDate: new Date().toISOString() };
  return (
    <div className="flex items-start space-x-3 pt-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={commentAuthor.avatarUrl || `https://placehold.co/32x32.png`} alt={commentAuthor.name} data-ai-hint="profile avatar small"/>
        <AvatarFallback>{commentAuthor.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 text-sm bg-muted/50 p-2.5 rounded-md">
        <div className="flex items-center justify-between">
            <Link href={`/profile/${commentAuthor.id}`} className="font-semibold hover:underline text-foreground">
                {commentAuthor.name}
            </Link>
            <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </p>
        </div>
        <p className="text-foreground/90 mt-1">{comment.content}</p>
      </div>
    </div>
  );
};

export function PostCard({ post, allUsers }: PostCardProps) {
  // Assuming post.author is now pre-enriched by the API
  const { author, title, content, media, category, tags, createdAt, reactions, comments: postComments, commentCount, isBookmarked } = post;
  const postAuthor = author || { id: 'unknown', name: 'Unknown User', avatarUrl: undefined, reputation: 0, joinedDate: '', email: '' };

  // Comments are also assumed to be pre-enriched by the API if present
  const enrichedComments = postComments?.slice(0, 2); 

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-subtle hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${postAuthor.id}`} className="flex items-center space-x-3 group">
            <Avatar className="h-10 w-10">
              <AvatarImage src={postAuthor.avatarUrl || `https://placehold.co/40x40.png`} alt={postAuthor.name} data-ai-hint="profile avatar" />
              <AvatarFallback>{postAuthor.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm font-headline group-hover:underline">{postAuthor.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                {category && ` · ${category}`}
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto">
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">More options</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {title && <CardTitle className="text-xl mb-2 font-headline">{title}</CardTitle>}
        <p className="text-foreground whitespace-pre-wrap break-words mb-3">{content.substring(0, 300)}{content.length > 300 && '...'}</p>
        {media && media.length > 0 && (
          <div className={`grid gap-2 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} mb-3`}>
            {media.map((item, index) => (
              <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
                {item.type === 'image' && (
                   <Image src={item.url} alt={item.name || title || `Post media ${index + 1}`} layout="fill" objectFit="cover" data-ai-hint="social media content" />
                )}
                 {(item.type === 'video' || item.type === 'document') && (
                    <div className="flex flex-col items-center justify-center h-full bg-muted">
                      <MediaIcon type={item.type} />
                      <span className="mt-2 text-sm text-muted-foreground">{item.name || item.type}</span>
                    </div>
                 )}
              </div>
            ))}
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map(tag => (
              <Link href={`/tags/${tag}`} key={tag} className="text-xs bg-secondary hover:bg-muted text-secondary-foreground px-2 py-1 rounded-full transition-colors">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {enrichedComments && enrichedComments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Comments:</h4>
            <div className="space-y-2">
              {enrichedComments.map(comment => (
                <CommentItem key={comment.id || comment._id?.toString()} comment={comment} />
              ))}
            </div>
            {commentCount > 2 && (
              <Button variant="link" asChild className="text-xs p-0 h-auto mt-2">
                <Link href={`/posts/${post.id || post._id?.toString()}`}>View all {commentCount} comments</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <ThumbsUp className="h-5 w-5 mr-1" /> Like
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <MessageCircle className="h-5 w-5 mr-1" /> {commentCount}
          </Button>
          {reactions && reactions.length > 0 && <ReactionDisplay reactions={reactions} />}
        </div>
        <Button variant="ghost" size="icon" className={`text-muted-foreground ${isBookmarked ? 'text-accent' : 'hover:text-accent'}`}>
          <Bookmark className="h-5 w-5" />
          <span className="sr-only">{isBookmarked ? 'Unbookmark' : 'Bookmark'}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
