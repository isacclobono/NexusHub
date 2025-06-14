
import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId; 
  id?: string; // String version of _id for client-side ease
  name: string;
  email: string;
  passwordHash?: string; // Only on server, never sent to client
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  joinedDate: string; // ISO Date String
  bookmarkedPostIds?: ObjectId[]; // Array of Post ObjectIds
}

export interface Comment {
  _id?: ObjectId;
  id?: string;
  postId: ObjectId; 
  parentId?: ObjectId; 
  authorId: ObjectId; 
  author: User; // Populated on server
  content: string;
  createdAt: string; // ISO Date String
  replyIds?: ObjectId[]; 
  replies?: Comment[]; // Populated for nested comments
}

export interface Post {
  _id?: ObjectId;
  id?: string;
  authorId: ObjectId; 
  author: User; // Populated on server
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  
  likedBy: ObjectId[]; // Array of user ObjectIds who liked the post
  likeCount: number;
  isLikedByCurrentUser?: boolean; // Client-side state, derived based on current user

  commentIds: ObjectId[]; // Array of Comment ObjectIds
  comments: Comment[]; // Populated on server (e.g., recent comments for feed)
  commentCount: number;

  isBookmarkedByCurrentUser?: boolean; // Client-side state, derived from user's bookmarks
  scheduledAt?: string; // ISO Date String
  status?: 'published' | 'draft' | 'scheduled';
}

export interface Event {
  _id?: ObjectId;
  id?: string;
  title: string;
  description:string;
  imageUrl?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  location?: string;
  organizerId: ObjectId; // ObjectId of the User who is the organizer
  organizer: User; // Populated User object
  rsvpIds: ObjectId[]; // Array of User ObjectIds who RSVP'd
  rsvps: User[]; // Array of populated User objects for those who RSVP'd
  waitlistIds?: ObjectId[];
  waitlist?: User[];
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedbackIds?: ObjectId[];
  feedback?: EventFeedback[];
}

export interface EventFeedback {
  _id?: ObjectId;
  id?: string;
  eventId: ObjectId;
  userId: ObjectId;
  user?: User;
  rating: number; // e.g., 1-5 stars
  comment?: string;
  createdAt: string; // ISO Date String
}

export interface Badge { // Kept for UserProfilePage, data still from JSON for now
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
  userId: ObjectId; // Target user ObjectId
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp' | 'bookmark_milestone' | 'new_follower' | 'new_like';
  title: string;
  message: string;
  link?: string; // Link to the relevant content
  isRead: boolean;
  createdAt: string; // ISO Date String
  relatedEntityId?: ObjectId; // ObjectId of the related entity (e.g., PostId, EventId)
  actor?: { 
    _id: ObjectId; 
    id: string; 
    name: string;
    avatarUrl?: string;
  }
}

