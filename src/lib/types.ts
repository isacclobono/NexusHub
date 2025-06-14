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
  author: User;
  content: string;
  createdAt: string;
  reactions: Reaction[];
  replies?: Comment[];
}

export interface Post {
  id: string;
  author: User;
  title?: string;
  content: string;
  media?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  reactions: Reaction[];
  comments: Comment[];
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
  organizer: User;
  rsvps: User[];
  waitlist: User[];
  maxAttendees?: number;
  category?: string;
  tags?: string[];
  feedback?: EventFeedback[];
}

export interface EventFeedback {
  id: string;
  user: User;
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
