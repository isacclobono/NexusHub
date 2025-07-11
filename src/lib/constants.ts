
import type { NavItem } from './types';
import { Home, MessageSquareText, CalendarDays, Users, Settings, Search, Bookmark, LogOut, UserCircle, UserPlus, LogIn, Bell, Archive, UsersRound, Flag } from 'lucide-react'; // Added Archive, Bell, UsersRound, Flag

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
    title: 'Communities',
    href: '/communities',
    icon: UsersRound,
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
  {
    title: 'My Posts',
    href: '/my-posts',
    icon: Archive,
  },
  {
    title: 'My Reports',
    href: '/my-reports',
    icon: Flag,
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
];


export const SIDENAV_USER_ITEMS_TEMPLATE: NavItem[] = [
 // "Profile" and "Settings" are intentionally removed from here as per user request
 // to only have them in the top-right header dropdown.
  {
    title: 'Logout',
    href: '#logout',
    icon: LogOut,
  },
   {
    title: 'Login',
    href: '/login',
    icon: LogIn,
  },
  {
    title: 'Register',
    href: '/register',
    icon: UserPlus,
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

export const COMMUNITY_PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public (Anyone can find, view, and join)' },
  { value: 'private', label: 'Private (Only members can see content and who\'s in the group. Join by request - approval not implemented yet.)' },
];
