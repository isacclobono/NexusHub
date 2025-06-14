
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Notification, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertTriangle, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const NotificationItemSkeleton = () => (
  <div className="flex items-start space-x-4 p-4 border-b">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="h-8 w-8" />
  </div>
);

const NotificationItem = ({ notification, onToggleRead, onDelete }: { notification: Notification; onToggleRead: (id: string) => void; onDelete: (id: string) => void; }) => {
  return (
    <Card className={`mb-4 ${notification.isRead ? 'bg-muted/50 opacity-70' : 'bg-card'} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 flex items-start space-x-4">
        <div className={`p-2 rounded-full ${notification.isRead ? 'bg-muted' : 'bg-primary/10'}`}>
          <Bell className={`h-6 w-6 ${notification.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base font-semibold mb-1">{notification.title}</CardTitle>
          <CardDescription className="text-sm mb-2">{notification.message}</CardDescription>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            {notification.link && (
              <Button variant="link" size="sm" asChild className="p-0 h-auto">
                <Link href={notification.link}>View Details</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-1">
          <Button variant="ghost" size="icon" onClick={() => onToggleRead(notification.id)} title={notification.isRead ? "Mark as unread" : "Mark as read"}>
            {notification.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
           <Button variant="ghost" size="icon" onClick={() => onDelete(notification.id)} title="Delete notification" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, you would fetch notifications for the current user.
      // For this demo, we'll fetch all notifications and filter client-side,
      // or assume notifications.json is user-specific (which it isn't set up to be yet).
      const response = await fetch('/api/data/notifications.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }
      let allNotifications: Notification[] = await response.json();
      // Filter for the current user, or show all if no specific user ID is in notifications.
      // This assumes notifications have a userId field.
      allNotifications = allNotifications.filter(n => n.userId === user.id);
      setNotifications(allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
      setError(e instanceof Error ? e.message : 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
    } else if (!authLoading && !user) {
      setIsLoading(false);
      setError("Please log in to view notifications.");
    }
  }, [authLoading, user, fetchNotifications]);

  const handleToggleRead = async (id: string) => {
    // SIMULATED: In a real app, call an API to update read status
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
    toast({ title: "Notification status updated (simulated)." });
  };

  const handleDelete = async (id: string) => {
    // SIMULATED: In a real app, call an API to delete
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({ title: "Notification deleted (simulated).", variant: "destructive" });
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast({ title: "All notifications marked as read (simulated)." });
  };
  
  const handleDeleteAll = () => {
    setNotifications([]);
    toast({ title: "All notifications deleted (simulated).", variant: "destructive"});
  };


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Bell className="mr-3 h-7 w-7" /> Notifications
          </h1>
        </div>
        <div className="space-y-4">
          <NotificationItemSkeleton />
          <NotificationItemSkeleton />
          <NotificationItemSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Bell className="mr-3 h-7 w-7" /> Notifications
        </h1>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleMarkAllRead}>Mark All as Read</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>Delete All</Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-center py-10">
          <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
            <AlertTriangle className="h-6 w-6 mr-3" />
            <div>
              <h2 className="font-semibold">Error</h2>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!error && notifications.length === 0 && (
        <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <Bell className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No New Notifications</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You're all caught up! We'll let you know when there's something new.
          </p>
        </div>
      )}

      {!error && notifications.length > 0 && (
        <div className="space-y-4">
          {notifications.map(notification => (
            <NotificationItem 
              key={notification.id} 
              notification={notification}
              onToggleRead={handleToggleRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
