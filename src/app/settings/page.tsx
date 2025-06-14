
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User, Bell, Palette, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings'); // Redirect to login if not authenticated
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // In a real app, you'd save these settings
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
        {authLoading ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        ) : (
          <div className="text-center">
             <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg text-muted-foreground">Please log in to view settings.</p>
             <Button onClick={() => router.push('/login?redirect=/settings')} className="mt-4">Login</Button>
          </div>
        )}
      </div>
    );
  }
  
  // Ensure user is not null before accessing its properties
  const displayName = user?.name || '';
  const userEmail = (user as any)?.email || 'user@example.com'; // Assuming email might be on user object
  const userBio = user?.bio || '';


  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center font-headline"><User className="mr-2 h-5 w-5 text-accent" /> Profile Settings</CardTitle>
            <CardDescription>Manage your public profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" defaultValue={displayName} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={userEmail} disabled />
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little about yourself..."
                defaultValue={userBio}
              />
            </div>
             <Button variant="outline" type="button">Change Profile Picture</Button>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center font-headline"><Bell className="mr-2 h-5 w-5 text-accent" /> Notification Preferences</CardTitle>
            <CardDescription>Control how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications" className="flex-grow">Email Notifications for New Posts</Label>
              <Switch id="emailNotifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="eventReminders" className="flex-grow">Event Reminders</Label>
              <Switch id="eventReminders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mentionNotifications" className="flex-grow">Notifications for Mentions</Label>
              <Switch id="mentionNotifications" />
            </div>
          </CardContent>
        </Card>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold flex items-center hover:no-underline p-4 bg-card rounded-t-lg border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
              <Lock className="mr-2 h-5 w-5 text-accent" /> Account & Security
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card rounded-b-lg border border-t-0 shadow-sm">
              <div className="space-y-4">
                <Button variant="outline" type="button" className="w-full md:w-auto">Change Password</Button>
                <Button variant="destructive" type="button" className="w-full md:w-auto">Delete Account</Button>
                <p className="text-xs text-muted-foreground">Account deletion is permanent and cannot be undone.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="mt-4">
             <AccordionTrigger className="text-lg font-semibold flex items-center hover:no-underline p-4 bg-card rounded-t-lg border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
              <Palette className="mr-2 h-5 w-5 text-accent" /> Appearance
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card rounded-b-lg border border-t-0 shadow-sm">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="flex-grow">Dark Mode</Label>
                <Switch id="darkMode" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Theme settings are managed globally for now.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end pt-4">
          <Button type="submit" className="btn-gradient">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
