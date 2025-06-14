
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User as UserIcon, Bell, Palette, Lock, Loader2, AlertTriangle } from 'lucide-react'; // Renamed User to UserIcon
import toast from 'react-hot-toast';
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth-provider";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional(),
  avatarUrl: z.string().url("Please enter a valid URL for your avatar.").optional().or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;


export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPreferences, setIsSubmittingPreferences] = useState(false);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
    }
  });
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings'); 
    }
    if (user) {
        form.reset({
            name: user.name || '',
            bio: user.bio || '',
            avatarUrl: user.avatarUrl || '',
        });
    }
  }, [authLoading, isAuthenticated, router, user, form]);


  const handleProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !user.id) {
        toast.error("User not authenticated. Please log in again.");
        return;
    }
    setIsSubmittingProfile(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile.");
      }
      toast.success("Profile updated successfully!");
      await refreshUser(); // Refresh user context to get updated data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePreferencesSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingPreferences(true);
    // Simulate API call
    setTimeout(() => {
        toast.success("Your preferences have been updated.");
        setIsSubmittingPreferences(false);
    }, 1000);
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
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
  
  const userEmail = user?.email || 'user@example.com'; 


  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary">Settings</h1>
      </div>

      <div className="space-y-8">
        <form onSubmit={form.handleSubmit(handleProfileSubmit)}>
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center font-headline"><UserIcon className="mr-2 h-5 w-5 text-accent" /> Profile Settings</CardTitle>
                <CardDescription>Manage your public profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input id="name" {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={userEmail} disabled />
                </div>
                </div>
                <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                    id="bio"
                    placeholder="Tell us a little about yourself..."
                    {...form.register("bio")}
                />
                {form.formState.errors.bio && <p className="text-xs text-destructive mt-1">{form.formState.errors.bio.message}</p>}
                </div>
                <div>
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input 
                        id="avatarUrl" 
                        placeholder="https://example.com/avatar.png" 
                        {...form.register("avatarUrl")}
                    />
                    {form.formState.errors.avatarUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.avatarUrl.message}</p>}
                </div>
                <Button type="submit" disabled={isSubmittingProfile} className="mt-4">
                  {isSubmittingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Profile Changes
                </Button>
            </CardContent>
            </Card>
        </form>

        <form onSubmit={handlePreferencesSubmit}>
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center font-headline"><Bell className="mr-2 h-5 w-5 text-accent" /> Notification Preferences</CardTitle>
                <CardDescription>Control how you receive notifications. (UI only, not functional)</CardDescription>
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
                 <Button type="submit" disabled={isSubmittingPreferences} className="mt-4">
                    {isSubmittingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Preferences
                </Button>
            </CardContent>
            </Card>
        </form>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold flex items-center hover:no-underline p-4 bg-card rounded-t-lg border shadow-sm data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
              <Lock className="mr-2 h-5 w-5 text-accent" /> Account & Security
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-card rounded-b-lg border border-t-0 shadow-sm">
              <div className="space-y-4">
                <Button variant="outline" type="button" className="w-full md:w-auto" onClick={() => toast.error("Change password not implemented.")}>Change Password</Button>
                <Button variant="destructive" type="button" className="w-full md:w-auto" onClick={() => toast.error("Delete account not implemented.")}>Delete Account</Button>
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
                <Switch id="darkMode" onCheckedChange={(checked) => {
                    if (checked) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                    toast.success(`Dark mode ${checked ? 'enabled' : 'disabled'}.`);
                }} defaultChecked={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Toggle dark or light theme.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
