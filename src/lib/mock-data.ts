import type { Post, User, Comment, Reaction, Event, Badge } from './types';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Alice Wonderland', avatarUrl: 'https://placehold.co/100x100.png', reputation: 1250, joinedDate: '2023-01-15', bio: 'Curiouser and curiouser! Exploring the world of tech.' },
  { id: 'user2', name: 'Bob The Builder', avatarUrl: 'https://placehold.co/100x100.png', reputation: 800, joinedDate: '2023-03-22', bio: 'Can we fix it? Yes, we can! Passionate about open source.' },
  { id: 'user3', name: 'Charlie Chaplin', avatarUrl: 'https://placehold.co/100x100.png', reputation: 150, joinedDate: '2024-05-01', bio: 'A day without laughter is a day wasted.' },
];

export const mockReactions: Reaction[] = [
  { emoji: '👍', count: 15, reactedByCurrentUser: true },
  { emoji: '❤️', count: 22 },
  { emoji: '😂', count: 8 },
  { emoji: '🤯', count: 5 },
];

export const mockComments: Comment[] = [
  {
    id: 'comment1',
    author: mockUsers[1],
    content: 'Great post! Really insightful.',
    createdAt: '2024-07-20T10:30:00Z',
    reactions: [{ emoji: '👍', count: 3 }],
    replies: [
      {
        id: 'reply1',
        author: mockUsers[0],
        content: 'Thanks Bob! Glad you liked it.',
        createdAt: '2024-07-20T10:35:00Z',
        reactions: [{ emoji: '❤️', count: 1 }],
      },
    ],
  },
  {
    id: 'comment2',
    author: mockUsers[2],
    content: 'I have a question about the third point, can you elaborate?',
    createdAt: '2024-07-20T11:00:00Z',
    reactions: [],
  },
];

export const mockPosts: Post[] = [
  {
    id: 'post1',
    author: mockUsers[0],
    title: 'Exploring the New AI Landscape',
    content: 'The field of Artificial Intelligence is rapidly evolving. From large language models to generative art, the possibilities seem endless. This post dives into some of the latest trends and what they mean for developers and creators alike. We will cover advancements in NLP, computer vision, and reinforcement learning.',
    media: [{ type: 'image', url: 'https://placehold.co/600x400.png', name: 'AI Brain' }],
    category: 'Technology',
    tags: ['AI', 'Machine Learning', 'Innovation'],
    createdAt: '2024-07-20T10:00:00Z',
    reactions: mockReactions,
    comments: mockComments,
    commentCount: mockComments.length,
    isBookmarked: true,
    status: 'published',
  },
  {
    id: 'post2',
    author: mockUsers[1],
    title: 'Community Garden Project Update',
    content: 'Our community garden is flourishing! Thanks to all the volunteers who helped with planting and weeding. We are expecting a bountiful harvest this season. Check out the latest pictures of our tomatoes, cucumbers, and herbs. Next meet-up is this Saturday at 9 AM.',
    media: [
        { type: 'image', url: 'https://placehold.co/600x300.png', name: 'Garden' },
        { type: 'image', url: 'https://placehold.co/600x350.png', name: 'Vegetables' }
    ],
    category: 'Community',
    tags: ['Gardening', 'Local', 'Volunteering'],
    createdAt: '2024-07-19T14:00:00Z',
    reactions: [
      { emoji: '🌱', count: 30 },
      { emoji: '❤️', count: 18 },
    ],
    comments: [mockComments[0]],
    commentCount: 1,
    status: 'published',
  },
  {
    id: 'post3',
    author: mockUsers[0],
    title: 'My Upcoming Talk on Web Performance',
    content: 'Excited to announce I\'ll be speaking at WebConf Global next month! My talk will focus on cutting-edge techniques for optimizing web application performance. Prepping my slides now - wish me luck! This is a draft post I plan to schedule.',
    category: 'Web Development',
    tags: ['Performance', 'Speaking', 'Conference'],
    createdAt: '2024-07-21T09:00:00Z',
    reactions: [],
    comments: [],
    commentCount: 0,
    status: 'draft',
  },
];

export const mockEvents: Event[] = [
  {
    id: 'event1',
    title: 'NexusHub Launch Party',
    description: 'Join us to celebrate the official launch of NexusHub! Food, drinks, music, and great company await. Come meet the team and other community members.',
    imageUrl: 'https://placehold.co/800x450.png',
    startTime: '2024-08-15T18:00:00Z',
    endTime: '2024-08-15T22:00:00Z',
    location: 'NexusHub HQ, 123 Community Drive',
    organizer: mockUsers[0],
    rsvps: [mockUsers[1], mockUsers[2]],
    waitlist: [],
    maxAttendees: 100,
    category: 'Social',
    tags: ['Launch', 'Party', 'Networking'],
  },
  {
    id: 'event2',
    title: 'AI Ethics Workshop',
    description: 'A deep dive into the ethical considerations of AI development and deployment. This interactive workshop will feature guest speakers and group discussions.',
    startTime: '2024-09-05T10:00:00Z',
    endTime: '2024-09-05T16:00:00Z',
    location: 'Online (Zoom)',
    organizer: mockUsers[1],
    rsvps: [mockUsers[0]],
    waitlist: [],
    category: 'Workshop',
    tags: ['AI', 'Ethics', 'Technology'],
  },
];

export const mockBadges: Badge[] = [
  { id: 'badge1', name: 'Pioneer', description: 'Joined NexusHub in the first month.', iconUrl: 'https://placehold.co/50x50.png' },
  { id: 'badge2', name: 'Contributor', description: 'Made 10+ valuable posts.', iconUrl: 'https://placehold.co/50x50.png' },
  { id: 'badge3', name: 'Engager', description: 'Received 100+ reactions on posts/comments.', iconUrl: 'https://placehold.co/50x50.png' },
];

export const getCurrentUser = (): User => mockUsers[0];
