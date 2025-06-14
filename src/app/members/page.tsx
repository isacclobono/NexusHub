
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // CardHeader, CardTitle not used directly
import { Users as UsersIcon, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const MemberCardSkeleton = () => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
      <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
      <div className="flex-1 space-y-2 mt-2 sm:mt-0">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

const MemberCard = ({ member }: { member: User }) => (
  <Card className="shadow-subtle hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
    <CardContent className="p-6 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
      <Link href={`/profile/${member.id}`}>
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20 cursor-pointer hover:opacity-90 transition-opacity">
          <AvatarImage src={member.avatarUrl || `https://placehold.co/100x100.png`} alt={member.name} data-ai-hint="profile avatar"/>
          <AvatarFallback className="text-3xl">{member.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <h2 className="text-xl font-headline mb-1 hover:text-primary transition-colors font-semibold"> {/* Changed from CardTitle */}
            <Link href={`/profile/${member.id}`}>{member.name}</Link>
        </h2>
        <p className="text-sm text-muted-foreground mb-1">Reputation: {member.reputation}</p>
        <p className="text-xs text-muted-foreground mb-3">Joined: {new Date(member.joinedDate).toLocaleDateString()}</p>
        {member.bio && <p className="text-sm text-foreground line-clamp-2 mb-3">{member.bio}</p>}
        <Button asChild size="sm" variant="outline" className="btn-gradient text-primary-foreground hover:opacity-90">
          <Link href={`/profile/${member.id}`}>View Profile</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users'); // Fetch from MongoDB via API
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status} ${response.statusText}`);
      }
      const data: User[] = await response.json();
      setMembers(data);
    } catch (e) {
      console.error("Failed to fetch members:", e);
      setError(e instanceof Error ? e.message : 'Failed to load members.');
    } finally {
      setIsLoading(false);
    }
  },[]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <UsersIcon className="mr-3 h-7 w-7" />
          Community Members
        </h1>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <MemberCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-10">
            <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
                <h2 className="font-semibold">Error loading members</h2>
                <p className="text-sm">{error}</p>
            </div>
            </div>
        </div>
      )}

      {!isLoading && !error && members.length === 0 && (
         <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <UsersIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No Members Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            It seems there are no members to display right now. Perhaps invite some?
          </p>
        </div>
      )}

      {!isLoading && !error && members.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {members.map((member) => (
            <MemberCard key={member.id!} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
