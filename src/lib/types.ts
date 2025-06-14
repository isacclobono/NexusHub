
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  reputation: number;
  joinedDate: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByCurrentUser?: boolean;
}

export interface Comment {
  id: string;
  postId?: string; // Added for linking comment to post
  parentId?: string; // For replies
  authorId: string; // Changed from User object to ID
  author?: User; // Optional: populated after fetching
  content: string;
  createdAt: string;
  reactions: Reaction[];
  replyIds?: string[]; // IDs of replies
  replies?: Comment[]; // Optional: populated after fetching
}

export interface Post {
  id: string;
  authorId: string; // Changed from User object to ID
  author?: User; // Optional: populated after fetching
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  reactions: Reaction[];
  commentIds?: string[]; // IDs of top-level comments
  comments?: Comment[]; // Optional: populated after fetching
  commentCount: number;
  isBookmarked?: boolean;
  scheduledAt?: string;
  status?: 'published' | 'draft' | 'scheduled';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startTime: string;
  endTime: string;
  location?: string;
  organizerId: string; // Changed from User object to ID
  organizer?: User; // Optional: populated after fetching
  rsvpIds: string[]; // Changed from User objects to IDs
  rsvps?: User[]; // Optional: populated after fetching
  waitlistIds: string[]; // Changed from User objects to IDs
  waitlist?: User[]; // Optional: populated after fetching
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedbackIds?: string[]; // IDs of feedback
  feedback?: EventFeedback[]; // Optional: populated after fetching
}

export interface EventFeedback {
  id: string;
  eventId: string; // Added for linking
  userId: string; // Changed from User object to ID
  user?: User; // Optional: populated after fetching
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
}
