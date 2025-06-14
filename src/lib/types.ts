
export interface User {
  id: string;
  name: string;
  email: string; 
  password?: string; 
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
  id: string;
  postId?: string; 
  parentId?: string; 
  authorId: string; 
  author?: User; 
  content: string;
  createdAt: string; // ISO Date String
  reactions: Reaction[];
  replyIds?: string[]; 
  replies?: Comment[]; 
}

export interface Post {
  id: string;
  authorId: string; 
  author?: User; 
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string; // ISO Date String
  updatedAt?: string; // ISO Date String
  reactions: Reaction[];
  commentIds?: string[];
  comments?: Comment[]; 
  commentCount: number;
  isBookmarked?: boolean;
  scheduledAt?: string; // ISO Date String
  status?: 'published' | 'draft' | 'scheduled';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  location?: string;
  organizerId: string; 
  organizer?: User; // Enriched on client or by API
  rsvpIds: string[]; 
  rsvps?: User[]; // Enriched on client or by API
  waitlistIds?: string[];
  waitlist?: User[]; 
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedbackIds?: string[];
  feedback?: EventFeedback[];
}

export interface EventFeedback {
  id: string;
  eventId: string; 
  userId: string; 
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
  id: string;
  userId: string; // User to whom the notification is addressed
  type: 'new_comment' | 'new_post' | 'event_reminder' | 'mention' | 'system' | 'event_rsvp';
  title: string;
  message: string;
  link?: string; // Optional link to the relevant content
  isRead: boolean;
  createdAt: string; // ISO Date String
  relatedEntityId?: string; // e.g., postId, eventId
  actor?: { // Optional: User who performed the action causing the notification
    id: string;
    name: string;
    avatarUrl?: string;
  }
}
