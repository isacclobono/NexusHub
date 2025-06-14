
import type { NavItem } from './types';
import { Home, MessageSquareText, CalendarDays, Users, Settings, Search, Bookmark, LogOut, UserCircle } from 'lucide-react';

export const APP_NAME = 'NexusHub';

export const SIDENAV_ITEMS: NavItem[] = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Feed',
    href: '/feed',
    icon: MessageSquareText,
  },
  {
    title: 'Events',
    href: '/events',
    icon: CalendarDays,
  },
  {
    title: 'Members',
    href: '/members',
    icon: Users,
    disabled: false,
  },
  {
    title: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    title: 'Bookmarks',
    href: '/bookmarks',
    icon: Bookmark,
  },
];

export const SIDENAV_USER_ITEMS: NavItem[] = [
 {
    title: 'Profile', // This specific item is handled by UserProfileButtonContentWrapper if user is logged in
    href: '/profile/me', 
    icon: UserCircle, 
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Logout', // This will be conditionally rendered or handled by auth state
    href: '#logout', // Placeholder, actual logout handled by auth context or action
    icon: LogOut,
  },
];

export const CATEGORIES = [
  'Technology',
  'AI',
  'Community',
  'Web Development',
  'Productivity',
  'Projects',
  'Lifestyle',
  'Science',
  'Arts & Culture',
  'Gaming',
  'Business',
  'Education',
  'Travel',
  'Food',
  'Health & Wellness',
  'Sports',
  'News',
  'Other',
];
