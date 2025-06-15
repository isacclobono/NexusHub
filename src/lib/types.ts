
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
  updatedAt?: string;
  bookmarkedPostIds?: ObjectId[];
  communityIds?: ObjectId[];
  notificationPreferences?: {
    emailNewPosts?: boolean;
    eventReminders?: boolean;
    mentionNotifications?: boolean;
  };
  privacy?: 'public' | 'private';
  isPrivatePlaceholder?: boolean; // Flag to indicate this is a minimal object for a private profile
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

  communityId?: ObjectId;
  communityName?: string;
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

  communityId?: ObjectId;
  communityName?: string;

  price?: number;
  currency?: string;
  updatedAt?: string;
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
  userId: ObjectId; // The user to whom the notification is intended
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp' | 'bookmark_milestone' | 'new_follower' | 'new_like' | 'community_join_request' | 'community_post_approved' | 'new_community_post' | 'new_community_event';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityId?: ObjectId; // ID of the post, event, comment, user, etc.
  actor?: { // The user who performed the action that triggered the notification
    _id: ObjectId;
    id: string; // String version of _id for client-side convenience
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
  creator?: User;
  memberIds: ObjectId[];
  adminIds?: ObjectId[];
  coverImageUrl?: string;
  privacy: 'public' | 'private';
  createdAt: string;
  updatedAt?: string;
  memberCount?: number;
}
