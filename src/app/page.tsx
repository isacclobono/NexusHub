
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareText, CalendarDays, Users, Sparkles, Coffee, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <section className="text-center mb-12 md:mb-16">
        <Image 
          src="https://placehold.co/600x300.png" 
          alt="NexusHub Welcome Banner" 
          width={600}
          height={300}
          className="mx-auto mb-6 rounded-lg shadow-xl object-cover"
          data-ai-hint="community welcome banner"
          priority
        />
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4">Welcome to NexusHub!</h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central place for community, collaboration, and content. Explore, connect, and create.
        </p>
      </section>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 md:mb-16">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center font-headline text-xl">
              <MessageSquareText className="mr-2 h-6 w-6 text-accent" />
              Community Feed
            </CardTitle>
            <CardDescription>Catch up on what's new and share your thoughts.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Dive into discussions, share your insights, and see what others are talking about.
            </p>
            <Button asChild className="w-full btn-gradient">
              <Link href="/feed">Go to Feed</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center font-headline text-xl">
              <CalendarDays className="mr-2 h-6 w-6 text-accent" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Discover and join community events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              From workshops to social gatherings, there's always something happening.
            </p>
            <Button asChild className="w-full btn-gradient">
              <Link href="/events">Explore Events</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center font-headline text-xl">
              <Users className="mr-2 h-6 w-6 text-accent" />
              Connect with Members
            </CardTitle>
            <CardDescription>Find and connect with other community members.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Build your network and collaborate with like-minded individuals.
            </p>
            <Button asChild className="w-full btn-gradient">
              <Link href="/members">View Members</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="text-center mt-10 p-6 bg-card rounded-lg shadow-md border">
          <h2 className="text-2xl font-headline font-semibold text-primary mb-3">
            {loading ? "Loading..." : (user ? `Welcome back, ${user.name}!` : "Ready to Dive In?")}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            {user ? "Explore your personalized feed, manage your profile, or discover new content." 
                  : "Join NexusHub to personalize your feed, bookmark content, and connect with members."}
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
             {user && !loading && (
                <Button asChild variant="outline">
                    <Link href={`/profile/${user.id}`}>View Your Profile</Link>
                </Button>
            )}
            <Button asChild variant="outline">
                <Link href="/search">
                    <SearchIcon className="mr-2 h-4 w-4"/> Search Content
                </Link>
            </Button>
            <Button asChild className="btn-gradient">
                <Link href="/posts/create">
                    <Coffee className="mr-2 h-4 w-4"/> Create a Post
                </Link>
            </Button>
          </div>
      </section>
    </div>
  );
}
