
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User as UserIcon, Bell, Palette, Lock, Loader2, AlertTriangle, Eye, EyeOff, Tag, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth-provider";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORIES } from '@/lib/constants';


const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional().nullable(),
  avatarUrl: z.string().url("Please enter a valid URL for your avatar.").optional().nullable().or(z.literal('')),
  notificationPreferences: z.object({
    emailNewPosts: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
    mentionNotifications: z.boolean().optional(),
  }).optional(),
  privacy: z.enum(['public', 'private']).default('public').optional(),
  subscribedTags: z.string().optional(), // Comma-separated string
  subscribedCategories: z.array(z.string()).optional().default([]),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmNewPassword: z.string().min(8, "Please confirm your new password."),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"],
});
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;


export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Set initial theme based on localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
      setCurrentTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setCurrentTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', newTheme);
    toast.success(`Theme changed to ${newTheme} mode.`);
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      bio: '',
      avatarUrl: '',
      notificationPreferences: {
        emailNewPosts: true,
        eventReminders: true,
        mentionNotifications: false,
      },
      privacy: 'public',
      subscribedTags: '',
      subscribedCategories: [],
    }
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings');
    }
    if (user) {
        profileForm.reset({
            name: user.name || '',
            bio: user.bio || '',
            avatarUrl: user.avatarUrl || '',
            notificationPreferences: {
                emailNewPosts: user.notificationPreferences?.emailNewPosts ?? true,
                eventReminders: user.notificationPreferences?.eventReminders ?? true,
                mentionNotifications: user.notificationPreferences?.mentionNotifications ?? false,
            },
            privacy: user.privacy || 'public',
            subscribedTags: user.subscribedTags?.join(', ') || '',
            subscribedCategories: user.subscribedCategories || [],
        });
    }
  }, [authLoading, isAuthenticated, router, user, profileForm]);


  const handleProfileSettingsSubmit = async (data: ProfileFormValues) => {
    if (!user || !user.id) {
        toast.error("User not authenticated. Please log in again.");
        return;
    }
    setIsSubmittingSettings(true);
    try {
      const parsedTags = data.subscribedTags
        ? data.subscribedTags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const payload = {
        name: data.name,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        notificationPreferences: {
            emailNewPosts: data.notificationPreferences?.emailNewPosts ?? true,
            eventReminders: data.notificationPreferences?.eventReminders ?? true,
            mentionNotifications: data.notificationPreferences?.mentionNotifications ?? false,
        },
        privacy: data.privacy || 'public',
        subscribedTags: parsedTags,
        subscribedCategories: data.subscribedCategories || [],
      };

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to update settings.");
      }
      toast.success("Settings updated successfully!");
      await refreshUser(); 
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsSubmittingSettings(false);
    }
  };

  const handleChangePasswordSubmit = async (data: ChangePasswordFormValues) => {
    if (!user || !user.id) {
        toast.error("User not authenticated. Please log in again.");
        return;
    }
    setIsSubmittingPassword(true);
    try {
        const response = await fetch(`/api/users/${user.id}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to change password.");
        }
        toast.success("Password changed successfully!");
        passwordForm.reset();
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "An unknown error occurred while changing password.");
    } finally {
        setIsSubmittingPassword(false);
    }
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

        <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSettingsSubmit)} className="space-y-8">
                <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center font-headline"><UserIcon className="mr-2 h-5 w-5 text-accent" /> Profile Settings</CardTitle>
                    <CardDescription>Manage your public profile information and privacy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel htmlFor="name">Display Name</FormLabel>
                                <FormControl>
                                    <Input id="name" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={userEmail} disabled />
                        </div>
                    </div>
                    <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel htmlFor="bio">Bio</FormLabel>
                            <FormControl>
                                <Textarea
                                    id="bio"
                                    placeholder="Tell us a little about yourself..."
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="avatarUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel htmlFor="avatarUrl">Avatar URL</FormLabel>
                            <FormControl>
                                <Input
                                    id="avatarUrl"
                                    placeholder="https://example.com/avatar.png"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={profileForm.control}
                        name="privacy"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Profile Privacy</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value || 'public'}
                                className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="public" id="privacy-public" />
                                  </FormControl>
                                  <FormLabel htmlFor="privacy-public" className="font-normal cursor-pointer flex items-center">
                                    <Eye className="mr-2 h-4 w-4 text-green-500" /> Public (Visible to everyone)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="private" id="privacy-private" />
                                  </FormControl>
                                  <FormLabel htmlFor="privacy-private" className="font-normal cursor-pointer flex items-center">
                                    <EyeOff className="mr-2 h-4 w-4 text-red-500" /> Private (Visibility limited)
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription>
                              Public profiles are visible to all users. Private profile visibility is restricted.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center font-headline"><Bell className="mr-2 h-5 w-5 text-accent" /> Notification Preferences</CardTitle>
                        <CardDescription>Control how you receive notifications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={profileForm.control}
                            name="notificationPreferences.emailNewPosts"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                <FormLabel htmlFor="emailNotificationsNewPosts" className="flex-grow">Email Notifications for New Posts</FormLabel>
                                <FormControl>
                                    <Switch
                                    id="emailNotificationsNewPosts"
                                    checked={field.value ?? true}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={profileForm.control}
                            name="notificationPreferences.eventReminders"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                <FormLabel htmlFor="eventReminders" className="flex-grow">Event Reminders</FormLabel>
                                <FormControl>
                                    <Switch
                                    id="eventReminders"
                                    checked={field.value ?? true}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={profileForm.control}
                            name="notificationPreferences.mentionNotifications"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                <FormLabel htmlFor="mentionNotifications" className="flex-grow">Notifications for Mentions</FormLabel>
                                <FormControl>
                                    <Switch
                                    id="mentionNotifications"
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center font-headline"><Tag className="mr-2 h-5 w-5 text-accent" /> Content Subscriptions</CardTitle>
                        <CardDescription>Get notified about new posts with tags or categories you follow.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={profileForm.control}
                            name="subscribedTags"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel htmlFor="subscribedTags">Subscribed Tags</FormLabel>
                                <FormControl>
                                    <Input id="subscribedTags" placeholder="e.g., react, nextjs, ai" {...field} />
                                </FormControl>
                                <FormDescription>Enter tags you want to follow, separated by commas.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="subscribedCategories"
                          render={() => (
                            <FormItem>
                              <div className="mb-4">
                                <FormLabel className="text-base flex items-center"><ListChecks className="mr-2 h-5 w-5 text-accent" /> Subscribed Categories</FormLabel>
                                <FormDescription>
                                  Select categories to receive notifications for new posts.
                                </FormDescription>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                {CATEGORIES.map((category) => (
                                  <FormField
                                    key={category}
                                    control={profileForm.control}
                                    name="subscribedCategories"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={category}
                                          className="flex flex-row items-center space-x-2 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              id={`category-${category}`}
                                              checked={field.value?.includes(category)}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([...(field.value || []), category])
                                                  : field.onChange(
                                                      (field.value || []).filter(
                                                        (value) => value !== category
                                                      )
                                                    )
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="font-normal cursor-pointer" htmlFor={`category-${category}`}>
                                            {category}
                                          </FormLabel>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </CardContent>
                </Card>


                <Button type="submit" disabled={isSubmittingSettings} className="mt-6 w-full md:w-auto btn-gradient">
                  {isSubmittingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save All Settings
                </Button>
            </form>
        </Form>

        <Accordion type="single" collapsible className="w-full mt-8">
          <AccordionItem value="item-1" className="border rounded-lg shadow-md overflow-hidden">
            <AccordionTrigger className="text-lg font-semibold flex items-center hover:no-underline p-4 bg-card data-[state=open]:rounded-b-none data-[state=open]:border-b">
              <Lock className="mr-2 h-5 w-5 text-accent" /> Account & Security
            </AccordionTrigger>
            <AccordionContent className="p-6 bg-card rounded-b-lg border-t-0">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handleChangePasswordSubmit)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>Must be at least 8 characters long.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmittingPassword} className="w-full md:w-auto btn-gradient">
                    {isSubmittingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Change Password
                  </Button>
                </form>
              </Form>
              <hr className="my-6"/>
              <div>
                <h3 className="text-md font-semibold mb-2">Account Deletion</h3>
                <Button variant="destructive" type="button" className="w-full md:w-auto" onClick={() => toast.error("Delete account feature is not yet implemented.")}>Delete Account</Button>
                <p className="text-xs text-muted-foreground mt-2">Account deletion is permanent and cannot be undone.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="mt-4 border rounded-lg shadow-md overflow-hidden">
             <AccordionTrigger className="text-lg font-semibold flex items-center hover:no-underline p-4 bg-card data-[state=open]:rounded-b-none data-[state=open]:border-b">
              <Palette className="mr-2 h-5 w-5 text-accent" /> Appearance
            </AccordionTrigger>
            <AccordionContent className="p-6 bg-card rounded-b-lg border-t-0">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="flex-grow text-base">Dark Mode</Label>
                <Switch
                  id="darkMode"
                  checked={currentTheme === 'dark'}
                  onCheckedChange={handleThemeChange}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Toggle dark or light theme for the application.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
    </div>
  );
}

