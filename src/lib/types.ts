
import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId; 
  id?: string; 
  name: string;
  email: string;
  passwordHash?: string; 
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  joinedDate: string; 
  bookmarkedPostIds?: ObjectId[]; 
  communityIds?: ObjectId[]; // Communities the user is a member of
}

export interface Comment {
  _id?: ObjectId;
  id?: string;
  postId: ObjectId; 
  postTitle?: string; 
  parentId?: ObjectId; 
  authorId: ObjectId; 
  author: User; 
  content: string;
  createdAt: string; 
  replyIds?: ObjectId[]; 
  replies?: Comment[]; 
}

export interface Post {
  _id?: ObjectId;
  id?: string;
  authorId: ObjectId; 
  author: User; 
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; 
  updatedAt?: string; 
  
  likedBy: ObjectId[]; 
  likeCount: number;
  isLikedByCurrentUser?: boolean; 

  commentIds: ObjectId[]; 
  comments: Comment[]; 
  commentCount: number;

  isBookmarkedByCurrentUser?: boolean; 
  scheduledAt?: string; 
  status?: 'published' | 'draft' | 'scheduled';

  communityId?: ObjectId; // ID of the community this post belongs to
  communityName?: string; // For display purposes if needed
}

export interface Event {
  _id?: ObjectId;
  id?: string;
  title: string;
  description:string;
  imageUrl?: string;
  startTime: string; 
  endTime: string; 
  location?: string;
  organizerId: ObjectId; 
  organizer: User; 
  rsvpIds: ObjectId[]; 
  rsvps: User[]; 
  waitlistIds?: ObjectId[];
  waitlist?: User[];
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedbackIds?: ObjectId[];
  feedback?: EventFeedback[];

  communityId?: ObjectId; // ID of the community this event belongs to
  communityName?: string; // For display purposes
}

export interface EventFeedback {
  _id?: ObjectId;
  id?: string;
  eventId: ObjectId;
  userId: ObjectId;
  user?: User;
  rating: number; 
  comment?: string;
  createdAt: string; 
}

export interface Badge {
  id: string; 
  name: string;
  description: string;
  iconUrl: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  variant?: 'default' | 'ghost';
  onClick?: () => void;
}

export interface Notification {
  _id?: ObjectId;
  id?: string;
  userId: ObjectId; 
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp' | 'bookmark_milestone' | 'new_follower' | 'new_like' | 'community_join_request' | 'community_post_approved'; // Added community types
  title: string;
  message: string;
  link?: string; 
  isRead: boolean;
  createdAt: string; 
  relatedEntityId?: ObjectId; 
  actor?: { 
    _id: ObjectId; 
    id: string; 
    name: string;
    avatarUrl?: string;
  }
}

export interface Community {
  _id?: ObjectId;
  id?: string;
  name: string;
  description: string;
  creatorId: ObjectId;
  creator?: User; // Populated
  memberIds: ObjectId[];
  adminIds?: ObjectId[]; // For future admin roles
  coverImageUrl?: string;
  privacy: 'public' | 'private'; // 'public' = anyone can join, 'private' = requires approval (approval not in this iteration)
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  memberCount?: number; // Denormalized for easier querying, updated by triggers or API logic
}
