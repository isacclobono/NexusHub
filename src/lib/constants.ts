
import type { NavItem } from './types';
import { Home, MessageSquareText, CalendarDays, Users, Settings, Search, Bookmark, LogOut, UserCircle, UserPlus, LogIn } from 'lucide-react'; // Added UserPlus, LogIn

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

// SIDENAV_USER_ITEMS is now dynamically generated in AppShell.tsx based on auth state
// This constant can be removed or kept for reference, but AppShell won't directly use it in the same way.
export const SIDENAV_USER_ITEMS_TEMPLATE: NavItem[] = [
 {
    title: 'Profile',
    href: '/profile/me', // Actual href will be /profile/:userId
    icon: UserCircle, 
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Logout',
    href: '#logout', // Handled by onClick
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
