
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, MessageSquareText, CalendarDays, Users, Sparkles, ShieldCheck, Search, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth-provider";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto text-center px-4">
            <Image 
              src="https://placehold.co/150x150.png" 
              alt="NexusHub Logo Large" 
              width={120}
              height={120}
              className="mx-auto mb-8 rounded-full shadow-2xl border-4 border-card"
              data-ai-hint="modern community logo"
              priority
            />
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-headline font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-purple-600 mb-8">
              Welcome to NexusHub
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              The ultimate platform where connections flourish, ideas spark, and communities thrive. Join us to discover, share, and grow together in a vibrant ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!loading && user ? (
                <>
                  <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Link href="/feed">
                      Explore Your Feed <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                   <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/5 shadow-sm hover:shadow-md transition-shadow">
                    <Link href={`/profile/${user.id}`}>
                      View Your Profile
                    </Link>
                  </Button>
                </>
              ) : !loading && !user ? (
                <>
                  <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
                    <Link href="/register">
                       <UserPlus className="mr-2 h-5 w-5" /> Join NexusHub Today
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/5 shadow-sm hover:shadow-md transition-shadow">
                    <Link href="/login">
                      <LogIn className="mr-2 h-5 w-5" /> Member Login
                    </Link>
                  </Button>
                </>
              ) : (
                 <Button size="lg" className="btn-gradient text-lg px-8 py-6 opacity-50 cursor-default" disabled>
                    Loading...
                  </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-headline font-bold text-center text-foreground mb-16">
              Discover the Power of Connection
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={MessageSquareText}
                title="Vibrant Community Feed"
                description="Engage in dynamic discussions, share rich media updates, and discover trending topics within an interactive feed."
                link="/feed"
                linkText="Dive into Discussions"
              />
              <FeatureCard
                icon={CalendarDays}
                title="Dynamic Event Management"
                description="Find, create, and join community events, workshops, and meetups. Never miss an opportunity to connect."
                link="/events"
                linkText="Explore Upcoming Events"
              />
              <FeatureCard
                icon={Users}
                title="Connect with Members"
                description="Build your network by discovering and connecting with like-minded individuals and experts in the community."
                link="/members"
                linkText="Meet the Community"
              />
              <FeatureCard
                icon={Sparkles}
                title="AI-Powered Assistance"
                description="Enhance your experience with smart tools for content categorization, moderation, and feed personalization."
                link="/feed" 
                linkText="Experience Smart Features"
              />
               <FeatureCard
                icon={Search}
                title="Advanced Search & Discovery"
                description="Quickly find relevant posts, events, and discussions with our powerful and intuitive search functionality."
                link="/search"
                linkText="Find What You Need"
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Safe & Moderated Space"
                description="Enjoy a positive environment thanks to intelligent content moderation and clear community guidelines."
                link="#"  // Placeholder link for guidelines
                linkText="Our Commitment to Safety"
              />
            </div>
          </div>
        </section>

        {/* Call to Action Section - Shown if user is not logged in */}
        {!loading && !user && (
            <section className="py-16 md:py-24 bg-gradient-to-br from-accent/10 via-background to-primary/5">
                <div className="container mx-auto text-center px-4">
                    <h2 className="text-3xl sm:text-4xl font-headline font-bold text-primary mb-6">
                    Ready to Join the Hub?
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
                    Become a part of NexusHub and start your journey of connection, learning, and collaboration today. It's free to join!
                    </p>
                    <Button asChild size="lg" className="btn-gradient text-xl px-12 py-7 shadow-lg hover:shadow-xl transition-shadow">
                        <Link href="/register">
                            Sign Up Now <UserPlus className="ml-2 h-6 w-6" />
                        </Link>
                    </Button>
                </div>
            </section>
        )}
      </main>

      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} NexusHub. All rights reserved. <br />
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link> | <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

const FeatureCard = ({ icon: Icon, title, description, link, linkText }: FeatureCardProps) => (
  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1.5 bg-card flex flex-col group">
    <CardHeader className="items-center text-center">
      <div className="p-5 bg-primary/10 rounded-full inline-block mb-5 border-2 border-primary/20 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <CardTitle className="font-headline text-2xl">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-center flex-grow">
      <CardDescription className="text-base">{description}</CardDescription>
    </CardContent>
    <CardFooter className="justify-center pt-2 pb-6">
      <Button asChild variant="link" className="text-primary hover:text-accent text-md font-semibold">
        <Link href={link}>{linkText} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" /></Link>
      </Button>
    </CardFooter>
  </Card>
);
