
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowRight, MessageSquareText, CalendarDays, Users, Sparkles, ShieldCheck, Search, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth-provider";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto text-center px-4">
            <Image 
              src="https://placehold.co/150x150.png" 
              alt="NexusHub Logo Large" 
              width={120}
              height={120}
              className="mx-auto mb-6 rounded-full shadow-lg"
              data-ai-hint="modern community logo"
              priority
            />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-primary mb-6">
              Welcome to NexusHub
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The all-in-one platform where connections flourish, ideas spark, and communities thrive. Join us to discover, share, and grow together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-gradient text-lg px-8 py-6">
                <Link href="/feed">
                  Explore the Feed <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {!loading && !user && (
                <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/5">
                  <Link href="/register">
                    Join NexusHub Today
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-headline font-semibold text-center text-foreground mb-12">
              Why NexusHub?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={MessageSquareText}
                title="Vibrant Community Feed"
                description="Engage in discussions, share updates, and discover trending topics within a dynamic and interactive feed."
                link="/feed"
                linkText="Dive into Discussions"
              />
              <FeatureCard
                icon={CalendarDays}
                title="Dynamic Event Management"
                description="Find, create, and join community events, workshops, and meetups. Never miss out on an opportunity to connect."
                link="/events"
                linkText="Explore Events"
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
                description="Leverage smart tools for content categorization, moderation, and feed personalization to enhance your experience."
                link="/feed" 
                linkText="Experience Smart Features"
              />
               <FeatureCard
                icon={Search}
                title="Advanced Search"
                description="Quickly find relevant posts, events, and discussions with our powerful and intuitive search functionality."
                link="/search"
                linkText="Find What You Need"
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Safe & Moderated"
                description="Enjoy a positive and respectful environment thanks to intelligent content moderation and community guidelines."
                link="/guidelines" // Placeholder link
                linkText="Our Commitment"
              />
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-20 bg-muted/50">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-3xl font-headline font-semibold text-primary mb-6">
              Ready to Join the Hub?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Become a part of NexusHub and start your journey of connection, learning, and collaboration today.
            </p>
            {!loading && !user && (
                 <Button asChild size="lg" className="btn-gradient text-lg px-10 py-6">
                    <Link href="/register">
                        Sign Up Now <LogIn className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            )}
            {!loading && user && (
                 <Button asChild size="lg" variant="outline" className="text-lg px-10 py-6">
                    <Link href={`/profile/${user.id}`}>
                        Go to Your Profile
                    </Link>
                </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} NexusHub. All rights reserved. <br />
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link> | <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
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
  <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 bg-card flex flex-col">
    <CardHeader className="items-center text-center">
      <div className="p-4 bg-primary/10 rounded-full inline-block mb-4">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <CardTitle className="font-headline text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-center flex-grow">
      <CardDescription>{description}</CardDescription>
    </CardContent>
    <CardFooter className="justify-center">
      <Button asChild variant="link" className="text-primary hover:text-accent">
        <Link href={link}>{linkText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </CardFooter>
  </Card>
);

