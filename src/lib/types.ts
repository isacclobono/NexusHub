
import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId; // MongoDB uses _id, will be string on client as 'id'
  id?: string; // string representation of _id, often used on client
  name: string;
  email: string;
  // passwordHash field is server-side only
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
  parentId?: string | ObjectId; // For threaded comments
  authorId: string | ObjectId; // Will be string on client if populated
  author?: User; // Populated author object
  content: string;
  createdAt: string; // ISO Date String
  reactions: Reaction[];
  replyIds?: (string | ObjectId)[]; // Array of comment IDs
  replies?: Comment[]; // Populated replies for threaded comments
}

export interface Post {
  _id?: ObjectId;
  id?: string;
  authorId: string | ObjectId; // Will be string on client if populated
  author?: User; // Populated author object
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  reactions: Reaction[];
  commentIds?: (string | ObjectId)[]; // Array of comment ObjectIds from DB
  comments?: Comment[]; // Populated comments
  commentCount: number;
  isBookmarked?: boolean; // Client-side state, or could be stored in DB
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
  organizerId: string | ObjectId; // Will be string on client if populated
  organizer?: User; // Populated organizer object
  rsvpIds: (string | ObjectId)[]; // Array of user ObjectIds from DB
  rsvps?: User[]; // Array of populated User objects for RSVPs
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
  userId: string | ObjectId; // Target user
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp';
  title: string;
  message: string;
  link?: string; // Link to the relevant content
  isRead: boolean;
  createdAt: string; // ISO Date String
  relatedEntityId?: string | ObjectId; // e.g., Post ID, Event ID
  actor?: { // The user who performed the action
    id: string | ObjectId;
    name: string;
    avatarUrl?: string;
  }
}
