import type { NavItem } from './types';
import { Home, MessageSquareText, CalendarDays, Users, Settings, Search, Bookmark, PlusCircle, LogOut } from 'lucide-react';

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
    disabled: true,
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
    title: 'Profile',
    href: '/profile/me', // Will be dynamically set to current user's ID
    icon: Settings, // Using Settings as a placeholder for User icon
  },
  {
    title: 'Logout',
    href: '/logout',
    icon: LogOut,
  },
];

export const CATEGORIES = [
  'Technology',
  'Community',
  'Web Development',
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
