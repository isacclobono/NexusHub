'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, ListFilter, Loader2 } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { mockPosts, mockEvents } from '@/lib/mock-data'; // Using mock data for search results
import type { Post, Event } from '@/lib/types';

// Mock search function
const performSearch = async (query: string, type: string, sortBy: string): Promise<{ posts: Post[], events: Event[] }> => {
  console.log(`Searching for "${query}" in ${type}, sorted by ${sortBy}`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay

  let filteredPosts: Post[] = [];
  let filteredEvents: Event[] = [];

  if (type === 'all' || type === 'posts') {
    filteredPosts = mockPosts.filter(post =>
      post.title?.toLowerCase().includes(query.toLowerCase()) ||
      post.content.toLowerCase().includes(query.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  if (type === 'all' || type === 'events') {
    filteredEvents = mockEvents.filter(event =>
      event.title.toLowerCase().includes(query.toLowerCase()) ||
      event.description.toLowerCase().includes(query.toLowerCase()) ||
      event.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }
  
  // Simple sort (in a real app, this would be more complex or backend-driven)
  if (sortBy === 'relevance') { // Placeholder for relevance
      // No specific relevance sort for mock data, keep as is
  } else if (sortBy === 'newest') {
      filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      filteredEvents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } else if (sortBy === 'oldest') {
      filteredPosts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      filteredEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }


  return { posts: filteredPosts, events: filteredEvents };
};


export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'posts', 'events', 'users'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'newest', 'oldest'
  const [searchResults, setSearchResults] = useState<{ posts: Post[], events: Event[] }>({ posts: [], events: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    const results = await performSearch(searchQuery, searchType, sortBy);
    setSearchResults(results);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><SearchIcon className="mr-2 h-6 w-6 text-primary" /> Advanced Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for posts, events, users..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search query"
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()} className="w-full sm:w-auto btn-gradient">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Search type">
                  <SelectValue placeholder="Search in..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="users" disabled>Users</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sort by">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full sm:w-auto" disabled>
                <ListFilter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Searching...</p>
        </div>
      )}

      {!isLoading && hasSearched && (searchResults.posts.length === 0 && searchResults.events.length === 0) && (
        <div className="text-center py-10">
           <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold">No results found for "{searchQuery}"</h2>
          <p className="text-muted-foreground">Try refining your search terms or adjusting filters.</p>
        </div>
      )}

      {!isLoading && (searchResults.posts.length > 0 || searchResults.events.length > 0) && (
        <div className="space-y-8">
          {searchResults.posts.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 font-headline">Posts ({searchResults.posts.length})</h2>
              <div className="space-y-6">
                {searchResults.posts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </section>
          )}

          {searchResults.events.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 font-headline">Events ({searchResults.events.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.events.map(event => (
                  // Simple event display for search, could be an EventCard component
                  <Card key={event.id} className="shadow-subtle">
                    <CardHeader>
                      <CardTitle className="text-md">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="link" asChild className="p-0 h-auto text-primary"><Link href={`/events/${event.id}`}>View Event</Link></Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
       {!isLoading && !hasSearched && (
        <div className="text-center py-20 text-muted-foreground">
          <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p>Enter a query above to start searching NexusHub.</p>
        </div>
      )}
    </div>
  );
}
