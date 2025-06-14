
import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId; // MongoDB uses _id
  id?: string; // string representation of _id, often used on client
  name: string;
  email: string;
  // password field should not be sent to client, handled server-side
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  joinedDate: string; // ISO Date String
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
  postId?: string | ObjectId;
  parentId?: string | ObjectId;
  authorId: string | ObjectId;
  author?: User;
  content: string;
  createdAt: string; // ISO Date String
  reactions: Reaction[];
  replyIds?: string[] | ObjectId[];
  replies?: Comment[];
}

export interface Post {
  _id?: ObjectId;
  id?: string;
  authorId: string | ObjectId;
  author?: User;
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  reactions: Reaction[];
  commentIds?: string[] | ObjectId[];
  comments?: Comment[];
  commentCount: number;
  isBookmarked?: boolean;
  scheduledAt?: string; // ISO Date String
  status?: 'published' | 'draft' | 'scheduled';
}

export interface Event {
  _id?: ObjectId;
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  location?: string;
  organizerId: string | ObjectId;
  organizer?: User;
  rsvpIds: (string | ObjectId)[]; // Array of user IDs
  rsvps?: User[];
  waitlistIds?: (string | ObjectId)[];
  waitlist?: User[];
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedbackIds?: (string | ObjectId)[];
  feedback?: EventFeedback[];
}

export interface EventFeedback {
  _id?: ObjectId;
  id?: string;
  eventId: string | ObjectId;
  userId: string | ObjectId;
  user?: User;
  rating: number; // e.g., 1-5 stars
  comment?: string;
  createdAt: string; // ISO Date String
}

export interface Badge {
  id: string; // For badges, we might keep them simple, maybe not in DB for this demo
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
  userId: string | ObjectId;
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string; // ISO Date String
  relatedEntityId?: string | ObjectId;
  actor?: {
    id: string | ObjectId;
    name: string;
    avatarUrl?: string;
  }
}
