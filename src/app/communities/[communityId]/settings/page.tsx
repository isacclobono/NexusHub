
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, AlertTriangle, UsersRound, UploadCloud, Settings, ArrowLeft, Trash2, Users, UserCog } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COMMUNITY_PRIVACY_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth-provider';
import { useParams, useRouter } from 'next/navigation';
import type { Community, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const communitySettingsSchema = z.object({
  name: z.string().min(3, 'Community name must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(1000),
  privacy: z.enum(['public', 'private'], { required_error: "Please select a privacy option." }),
  coverImageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
});

type CommunitySettingsFormValues = z.infer<typeof communitySettingsSchema>;

const transferOwnershipSchema = z.object({
    newOwnerId: z.string().min(1, { message: "New owner User ID is required." }).refine(val => /^[0-9a-fA-F]{24}$/.test(val), { message: "Invalid User ID format. Must be a 24-character hex string."})
});
type TransferOwnershipFormValues = z.infer<typeof transferOwnershipSchema>;


const CommunitySettingsSkeleton = () => (
  <div className="container mx-auto py-8">
    <Skeleton className="h-10 w-48 mb-6" />
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  </div>
);

export default function CommunitySettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const communityId = params.communityId as string;
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityMembers, setCommunityMembers] = useState<User[]>([]);


  const form = useForm<CommunitySettingsFormValues>({
    resolver: zodResolver(communitySettingsSchema),
    defaultValues: {
      name: '',
      description: '',
      privacy: 'public',
      coverImageUrl: '',
    },
  });

  const transferForm = useForm<TransferOwnershipFormValues>({
    resolver: zodResolver(transferOwnershipSchema),
    defaultValues: {
        newOwnerId: '',
    }
  });


  const fetchCommunityDetailsAndMembers = useCallback(async () => {
    if (!communityId) return;
    setIsLoadingCommunity(true);
    setError(null);
    try {
      const response = await fetch(`/api/communities/${communityId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch community details.');
      }
      const data: Community = await response.json();
      setCommunity(data);
      form.reset({
        name: data.name,
        description: data.description,
        privacy: data.privacy,
        coverImageUrl: data.coverImageUrl || '',
      });

      // Fetch members
      const membersResponse = await fetch(`/api/communities/${communityId}/members`);
      if(membersResponse.ok) {
        const membersData: User[] = await membersResponse.json();
        setCommunityMembers(membersData);
      } else {
        console.warn("Could not fetch community members for owner selection.");
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load community data.');
      console.error(e);
    } finally {
      setIsLoadingCommunity(false);
    }
  }, [communityId, form]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("You must be logged in to manage community settings.");
      router.push(`/login?redirect=/communities/${communityId}/settings`);
      return;
    }
    if (communityId) {
      fetchCommunityDetailsAndMembers();
    }
  }, [authLoading, isAuthenticated, router, communityId, fetchCommunityDetailsAndMembers]);

  useEffect(() => {
    if (community && user && community.creatorId.toString() !== user.id) {
        toast.error("You are not authorized to edit this community's settings.");
        router.push(`/communities/${communityId}`);
    }
  }, [community, user, router, communityId]);


  async function onSubmit(data: CommunitySettingsFormValues) {
    if (!user || !user.id) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    if (!communityId || !community) {
        toast.error("Community data not loaded.");
        return;
    }
    if (community.creatorId.toString() !== user.id) {
        toast.error("You are not authorized to perform this action.");
        return;
    }

    setIsSubmitting(true);
    const updatePayload = {
      ...data,
      userId: user.id,
    };

    try {
      const response = await fetch(`/api/communities/${communityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update community.');
      }
      toast.success('Community settings updated successfully!');
      if (result.community) {
        setCommunity(result.community);
        form.reset({
          name: result.community.name,
          description: result.community.description,
          privacy: result.community.privacy,
          coverImageUrl: result.community.coverImageUrl || '',
        });
      }
      // router.push(`/communities/${communityId}`); // No need to push if already on settings page
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
      console.error("Error updating community:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteCommunity = async () => {
    if (!user || !user.id || !community || community.creatorId.toString() !== user.id) {
      toast.error("Unauthorized or community data missing.");
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/communities/${communityId}?userId=${user.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete community.');
      }
      toast.success(result.message || 'Community deleted successfully!');
      router.push('/communities');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete community.');
      console.error("Error deleting community:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransferOwnership = async (data: TransferOwnershipFormValues) => {
    if (!user || !user.id || !community || community.creatorId.toString() !== user.id) {
        toast.error("Unauthorized or community data missing.");
        return;
    }
    if (user.id === data.newOwnerId) {
        toast.error("You cannot transfer ownership to yourself.");
        return;
    }

    setIsTransferring(true);
    try {
        const response = await fetch(`/api/communities/${communityId}/transfer-ownership`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId: user.id, newOwnerId: data.newOwnerId }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to transfer ownership.");
        }
        toast.success(result.message || "Ownership transferred successfully!");
        // The current user is no longer the owner, so they might lose access to this settings page
        // or their permissions change. Redirecting them to the community page is safest.
        router.push(`/communities/${communityId}`);
    } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not transfer ownership.");
    } finally {
        setIsTransferring(false);
    }
  };


  if (authLoading || isLoadingCommunity) {
    return <CommunitySettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-destructive">{error}</p>
        <Button onClick={() => router.push(`/communities/${communityId}`)} className="mt-4">Back to Community</Button>
      </div>
    );
  }

  if (!community || (user && community.creatorId.toString() !== user.id && !isLoadingCommunity) ) {
     return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg text-muted-foreground">
          { !community ? "Community not found." : "You are not authorized to edit these settings."}
        </p>
        <Button onClick={() => router.push('/communities')} className="mt-4">Go to Communities</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href={`/communities/${communityId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Community
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Settings className="mr-3 h-7 w-7 text-primary" /> Community Settings
          </CardTitle>
          <CardDescription>Manage settings for "{community?.name || 'your community'}".</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Privacy Settings</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        {COMMUNITY_PRIVACY_OPTIONS.map(option => (
                          <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={option.value} />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="https://example.com/your-cover-image.png" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                     <FormDescription>Link to an image for your community's banner. Leave blank to use default.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="p-0 pt-8">
                <Button type="submit" disabled={isSubmitting || authLoading} className="w-full md:w-auto btn-gradient">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto shadow-xl mt-8 border-orange-500/50">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center text-orange-600">
                <UserCog className="mr-3 h-6 w-6" /> Transfer Ownership
            </CardTitle>
            <CardDescription>Transfer the ownership of this community to another member. This action is irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit(handleTransferOwnership)} className="space-y-4">
                     <FormField
                        control={transferForm.control}
                        name="newOwnerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Owner User ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter User ID of the new owner" {...field} />
                                </FormControl>
                                <FormDescription>
                                  The new owner must be a current member of this community.
                                  You can find a user's ID on their profile page URL (e.g., /profile/USER_ID).
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {communityMembers.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">
                                For reference, some member IDs:
                            </p>
                             <p className="text-xs text-muted-foreground">
                                The new owner must be a current member of this community.
                                You can find a user's ID on their profile page URL (e.g., /profile/USER_ID).
                            </p>
                            <ul className="list-disc list-inside max-h-20 overflow-y-auto text-xs text-muted-foreground">
                            {communityMembers.slice(0,5).map(member => {
                                if (member.id !== user?.id) { // Don't list current owner
                                    return (<li key={member.id}><code>{member.name}: {member.id}</code></li>);
                                }
                                return null;
                            })}
                            {communityMembers.length > 5 && <li className="text-muted-foreground">...and {communityMembers.length - (communityMembers.filter(m => m.id === user?.id).length > 0 ? 6 : 5) > 0 ? communityMembers.length - (communityMembers.filter(m => m.id === user?.id).length > 0 ? 6 : 5) : 'more'} more</li>}
                            </ul>
                        </div>
                    )}
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" className="w-full md:w-auto border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                                <UserCog className="mr-2 h-4 w-4" /> Initiate Transfer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Ownership Transfer</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to transfer ownership of "<strong>{community?.name}</strong>" to the user with ID: <strong>{transferForm.getValues("newOwnerId")}</strong>?
                                    This action cannot be undone. You will lose creator privileges.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isTransferring}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={transferForm.handleSubmit(handleTransferOwnership)} // Trigger form submission
                                    disabled={isTransferring || !transferForm.formState.isValid}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    {isTransferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Yes, transfer ownership
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </form>
            </Form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto shadow-xl mt-8 border-destructive/50">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center text-destructive">
                <AlertTriangle className="mr-3 h-6 w-6" /> Danger Zone
            </CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete This Community
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the community
                            "<strong>{community?.name}</strong>" and all of its content, including posts and events.
                            Members will lose access.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCommunity}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, delete community
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
                Deleting the community will remove all its data. This action is irreversible.
            </p>
        </CardContent>
      </Card>

    </div>
  );
}

