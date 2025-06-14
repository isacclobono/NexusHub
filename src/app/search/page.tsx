
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, ListFilter, Loader2, AlertTriangle } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import type { Post, Event as EventType } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth-provider'; 

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
  const { user, isAuthenticated, refreshUser } = useAuth();


  const performSearch = useCallback(async (currentSearchQuery: string, currentSearchType: string, currentSortBy: string) => {
    if (!currentSearchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    
    try {
      const forUserIdParam = isAuthenticated && user ? `&forUserId=${user.id}` : "";
      const response = await fetch(`/api/search?q=${encodeURIComponent(currentSearchQuery)}&type=${currentSearchType}&sortBy=${currentSortBy}${forUserIdParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Search request failed");
      }
      let data = await response.json();

      // API should return posts with isLikedByCurrentUser and isBookmarkedByCurrentUser if forUserId is provided
      setSearchResults(data);

    } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : "Could not perform search.");
        setSearchResults({posts: [], events: []});
    } finally {
        setIsLoading(false);
    }
  }, [isAuthenticated, user]);
  
  const handleSearchSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    performSearch(searchQuery, searchType, sortBy);
  };

  // Callback for PostCard to update UI after bookmark action
  const handlePostBookmarkToggle = async () => {
    await refreshUser(); 
    if (searchQuery.trim() && hasSearched) {
      performSearch(searchQuery, searchType, sortBy); // Re-run search to update post states
    }
  };

  const handlePostLikeToggle = async (postId: string, isCurrentlyLiked: boolean, updatedPostFromServer: Post) => {
    setSearchResults(prevResults => ({
      ...prevResults,
      posts: prevResults.posts.map(p => p.id === postId ? updatedPostFromServer : p)
    }));
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setSearchResults(prevResults => ({
      ...prevResults,
      posts: prevResults.posts.filter(p => p.id !== deletedPostId)
    }));
  };


  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><SearchIcon className="mr-2 h-6 w-6 text-primary" /> Advanced Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for posts, events..."
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
              <Select value={searchType} onValueChange={setSearchType} disabled={isLoading}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Search type">
                  <SelectValue placeholder="Search in..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy} disabled={isLoading}>
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

      <>
        {isLoading && hasSearched && ( 
          <div className="space-y-8">
            <SearchResultSkeleton count={searchType === 'all' ? 2 : 3} />
            {(searchType === 'all' || searchType === 'events') && <SearchResultSkeleton count={searchType === 'all' ? 1 : 2}/>}
          </div>
        )}

        {!isLoading && hasSearched && (searchResults.posts.length === 0 && searchResults.events.length === 0) && !error && (
          <div className="text-center py-10">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">No results found for "{searchQuery}"</h2>
            <p className="text-muted-foreground">Try refining your search terms or adjusting filters.</p>
          </div>
        )}
        
        {!isLoading && error && hasSearched && ( 
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
                  {searchResults.posts.map(post => (
                    <PostCard 
                        key={post.id!} 
                        post={post} 
                        onToggleBookmark={handlePostBookmarkToggle} 
                        onToggleLike={handlePostLikeToggle}
                        onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </div>
              </section>
            )}

            {searchResults.events.length > 0 && (searchType === 'all' || searchType === 'events') && (
              <section>
                <h2 className="text-xl font-semibold mb-4 font-headline">Events ({searchResults.events.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.events.map(event => (
                    <Card key={event.id!} className="shadow-subtle hover:shadow-md transition-shadow">
                      <Link href={`/events/${event.id!}`}>
                          {event.imageUrl && <div className="relative h-40 w-full"><Image src={event.imageUrl} alt={event.title} layout="fill" objectFit="cover" className="rounded-t-lg" data-ai-hint="event highlight"/></div>}
                      </Link>
                      <CardHeader className={!event.imageUrl ? "" : "pt-4"}>
                        <CardTitle className="text-md hover:text-primary"><Link href={`/events/${event.id!}`}>{event.title}</Link></CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground line-clamp-3">
                        {event.description}
                      </CardContent>
                      <CardFooter>
                          <Button variant="link" asChild className="p-0 h-auto text-primary"><Link href={`/events/${event.id!}`}>View Event</Link></Button>
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
    </div>
  );
}

