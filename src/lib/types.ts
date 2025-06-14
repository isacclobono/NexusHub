
import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId; 
  id?: string; 
  name: string;
  email: string;
  passwordHash?: string; // Only on server, never sent to client
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  joinedDate: string; // ISO Date String
  bookmarkedPostIds?: ObjectId[]; // For storing bookmarked post IDs
}

export interface Reaction {
  id?: string;
  emoji: string;
  count: number;
  reactedByCurrentUser?: boolean;
}

export interface Comment {
  _id?: ObjectId;
  id?: string;
  postId?: ObjectId; 
  parentId?: ObjectId; 
  authorId: ObjectId; 
  author?: User; 
  content: string;
  createdAt: string; // ISO Date String
  reactions: Reaction[];
  replyIds?: ObjectId[]; 
  replies?: Comment[]; 
}

export interface Post {
  _id?: ObjectId;
  id?: string;
  authorId: ObjectId; 
  author?: User; 
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  reactions: Reaction[];
  commentIds?: ObjectId[]; 
  comments?: Comment[]; 
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
  organizerId: ObjectId; 
  organizer?: User; 
  rsvpIds: ObjectId[]; 
  rsvps?: User[]; 
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
  userId: ObjectId; // Target user
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp' | 'bookmark_milestone' | 'new_follower';
  title: string;
  message: string;
  link?: string; // Link to the relevant content
  isRead: boolean;
  createdAt: string; // ISO Date String
  relatedEntityId?: ObjectId; 
  actor?: { 
    id: ObjectId;
    name: string;
    avatarUrl?: string;
  }
}
