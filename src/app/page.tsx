
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <section className="text-center mb-12">
        <Image 
          src="https://placehold.co/300x200.png" 
          alt="NexusHub Welcome Banner" 
          width={300}
          height={200}
          className="mx-auto mb-6 rounded-lg shadow-md"
          data-ai-hint="community welcome banner"
        />
        <h1 className="text-4xl font-headline font-bold text-primary mb-4">Welcome to NexusHub!</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central place for community, collaboration, and content. Explore, connect, and create.
        </p>
      </section>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <Newspaper className="mr-2 h-6 w-6 text-accent" />
              Latest Posts
            </CardTitle>
            <CardDescription>Catch up on what's new in the community.</CardDescription>
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

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <Sparkles className="mr-2 h-6 w-6 text-accent" />
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
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-headline">
              <Coffee className="mr-2 h-6 w-6 text-accent" />
              Create & Share
            </CardTitle>
            <CardDescription>Contribute your voice to NexusHub.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Share your thoughts, start a discussion, or announce an event.
            </p>
            <Button asChild className="w-full btn-gradient">
              <Link href="/posts/create">Create a Post</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="text-center mt-10 p-6 bg-card rounded-lg shadow-sm border">
          <h2 className="text-2xl font-headline font-semibold text-primary mb-3">Ready to Dive In?</h2>
          <p className="text-muted-foreground mb-6">
            Personalize your feed, bookmark interesting content, and connect with fellow members.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
                <Link href="/profile/me">View Your Profile</Link>
            </Button>
            <Button asChild className="btn-gradient">
                <Link href="/search">Search Content</Link>
            </Button>
          </div>
      </section>
    </div>
  );
}
