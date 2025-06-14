
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, ListFilter, Loader2, AlertTriangle } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import type { Post, Event as EventType, User, Comment as CommentType } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';


const SearchResultSkeleton = ({ count = 2 }: { count?: number}) => (
  <section className="space-y-4">
    <Skeleton className="h-7 w-1/4 mb-4" />
    <div className="space-y-6">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  </section>
);

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [searchResults, setSearchResults] = useState<{ posts: Post[], events: EventType[] }>({ posts: [], events: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allEvents, setAllEvents] = useState<EventType[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadAllData = useCallback(async () => {
    setIsLoading(true); // Set loading true for initial data load
    setError(null);
    try {
      const [postsRes, eventsRes, usersRes] = await Promise.all([
        fetch('/api/data/posts.json'),
        fetch('/api/data/events.json'),
        fetch('/api/data/users.json')
      ]);
      if (!postsRes.ok || !eventsRes.ok || !usersRes.ok) throw new Error("Failed to load initial data for search.");
      
      const postsData: Post[] = await postsRes.json();
      const eventsData: EventType[] = await eventsRes.json();
      const usersData: User[] = await usersRes.json();

      setAllUsers(usersData);

      const enrichedPosts = postsData.map(post => {
        const author = usersData.find(u => u.id === post.authorId) || 
                       {id: 'unknown', name: 'Unknown', reputation: 0, joinedDate: ''} as User;
        const comments = post.comments?.map(comment => ({
          ...comment,
          author: usersData.find(u => u.id === comment.authorId) || 
                  { id: 'unknown', name: 'Unknown Commenter', reputation: 0, joinedDate: new Date().toISOString() } as User
        })) || [];
        return { ...post, author, comments };
      });
      setAllPosts(enrichedPosts);

      const enrichedEvents = eventsData.map(event => ({
        ...event,
        organizer: usersData.find(u => u.id === event.organizerId) || {id: 'unknown', name: 'Unknown', reputation: 0, joinedDate: ''} as User,
        rsvps: event.rsvpIds.map(id => usersData.find(u => u.id === id)).filter(Boolean) as User[],
      }));
      setAllEvents(enrichedEvents);
      
      setDataLoaded(true);
    } catch (e) {
      console.error("Error loading data for search:", e);
      setError(e instanceof Error ? e.message : "Could not load data for search.");
      setDataLoaded(true); 
    } finally {
        setIsLoading(false); // Finish initial loading
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  

  const performClientSearch = (query: string, type: string, sort: string): { posts: Post[], events: EventType[] } => {
    let filteredPosts: Post[] = [];
    let filteredEvents: EventType[] = [];
    const lowerQuery = query.toLowerCase();

    if (type === 'all' || type === 'posts') {
      filteredPosts = allPosts.filter(post =>
        post.title?.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        post.author?.name.toLowerCase().includes(lowerQuery) ||
        post.comments?.some(comment => comment.content.toLowerCase().includes(lowerQuery))
      );
    }

    if (type === 'all' || type === 'events') {
      filteredEvents = allEvents.filter(event =>
        event.title.toLowerCase().includes(lowerQuery) ||
        event.description.toLowerCase().includes(lowerQuery) ||
        event.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        event.organizer?.name.toLowerCase().includes(lowerQuery) ||
        event.location?.toLowerCase().includes(lowerQuery)
      );
    }
    
    if (sort === 'newest') {
        filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        filteredEvents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } else if (sort === 'oldest') {
        filteredPosts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        filteredEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    // 'relevance' sort is default (order from JSON) or could be improved with more sophisticated scoring.

    return { posts: filteredPosts.filter(p => p.status === 'published'), events: filteredEvents };
  };


  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !dataLoaded) return;

    setIsLoading(true); // Set loading for search operation
    setHasSearched(true);
    setError(null);
    
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    
    const results = performClientSearch(searchQuery, searchType, sortBy);
    setSearchResults(results);
    setIsLoading(false); // Finish search loading
  };

  if (!dataLoaded && isLoading) { // Initial data loading state
    return (
      <div className="container mx-auto py-8">
        <Card className="mb-8 shadow-md">
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
        <div className="text-center py-10">
         <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
         <p className="mt-4 text-muted-foreground">Loading search engine...</p>
       </div>
     </div>
    );
  }
  
  if (dataLoaded && error && !hasSearched) { // Error during initial data load
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
                <h2 className="font-semibold">Error initializing search</h2>
                <p className="text-sm">{error}</p>
            </div>
        </div>
      </div>
    );
  }


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
                  placeholder="Search for posts, events, comments..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search query"
                  disabled={!dataLoaded}
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim() || !dataLoaded} className="w-full sm:w-auto btn-gradient">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={searchType} onValueChange={setSearchType} disabled={!dataLoaded || isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Search type">
                  <SelectValue placeholder="Search in..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="posts">Posts & Comments</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="users" disabled>Users (soon)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy} disabled={!dataLoaded || isLoading}>
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

      {dataLoaded && (
        <>
          {isLoading && hasSearched && ( // Loading state for search results
            <div className="space-y-8">
              <SearchResultSkeleton count={searchType === 'all' ? 2 : 3} />
              {(searchType === 'all' || searchType === 'events') && <SearchResultSkeleton count={searchType === 'all' ? 1 : 2}/>}
            </div>
          )}

          {!isLoading && hasSearched && (searchResults.posts.length === 0 && searchResults.events.length === 0) && (
            <div className="text-center py-10">
              <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold">No results found for "{searchQuery}"</h2>
              <p className="text-muted-foreground">Try refining your search terms or adjusting filters.</p>
            </div>
          )}
          
          {!isLoading && error && hasSearched && ( // Error specific to a search operation
            <div className="text-center py-10">
                <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
                <AlertTriangle className="h-6 w-6 mr-3" />
                <div>
                    <h2 className="font-semibold">Search Error</h2>
                    <p className="text-sm">{error}</p>
                </div>
                </div>
            </div>
          )}


          {!isLoading && !error && (searchResults.posts.length > 0 || searchResults.events.length > 0) && (
            <div className="space-y-8">
              {searchResults.posts.length > 0 && (searchType === 'all' || searchType === 'posts') && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 font-headline">Posts ({searchResults.posts.length})</h2>
                  <div className="space-y-6">
                    {searchResults.posts.map(post => <PostCard key={post.id} post={post} allUsers={allUsers} />)}
                  </div>
                </section>
              )}

              {searchResults.events.length > 0 && (searchType === 'all' || searchType === 'events') && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 font-headline">Events ({searchResults.events.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.events.map(event => (
                      <Card key={event.id} className="shadow-subtle hover:shadow-md transition-shadow">
                        <Link href={`/events/${event.id}`}>
                            {event.imageUrl && <div className="relative h-40 w-full"><Image src={event.imageUrl} alt={event.title} layout="fill" objectFit="cover" className="rounded-t-lg" data-ai-hint="event highlight"/></div>}
                        </Link>
                        <CardHeader className={!event.imageUrl ? "" : "pt-4"}>
                          <CardTitle className="text-md hover:text-primary"><Link href={`/events/${event.id}`}>{event.title}</Link></CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground line-clamp-3">
                          {event.description}
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
          {!isLoading && !hasSearched && !error && (
            <div className="text-center py-20 text-muted-foreground">
              <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Enter a query above to start searching NexusHub.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
