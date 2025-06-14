
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertTriangle, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

const NotificationItemSkeleton = () => (
  <div className="flex items-start space-x-4 p-4 border-b bg-card rounded-md shadow-sm">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <div className="flex flex-col space-y-1">
      <Skeleton className="h-8 w-8 rounded-sm" />
      <Skeleton className="h-8 w-8 rounded-sm" />
    </div>
  </div>
);

const NotificationItem = ({ notification, onToggleRead, onDelete }: { notification: Notification; onToggleRead: (id: string, currentReadStatus: boolean) => void; onDelete: (id: string) => void; }) => {
  return (
    <Card className={`mb-4 ${notification.isRead ? 'bg-muted/50 opacity-70' : 'bg-card'} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 flex items-start space-x-4">
        <div className={`p-2 rounded-full ${notification.isRead ? 'bg-muted' : 'bg-primary/10'}`}>
          <Bell className={`h-6 w-6 ${notification.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-1">{notification.title}</h3> {/* Changed from CardTitle */}
          <p className="text-sm mb-2 text-foreground/80">{notification.message}</p> {/* Changed from CardDescription */}
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
          <Button variant="ghost" size="icon" onClick={() => onToggleRead(notification.id!, notification.isRead)} title={notification.isRead ? "Mark as unread" : "Mark as read"}>
            {notification.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
           <Button variant="ghost" size="icon" onClick={() => onDelete(notification.id!)} title="Delete notification" className="text-destructive hover:text-destructive">
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
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  

  const fetchNotifications = useCallback(async () => {
    if (!user || !user.id) {
        if(!authLoading) { // Only set error if auth has resolved and user is not available
            setError("Please log in to view notifications.");
            setIsLoading(false);
        }
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Fetch from MongoDB via API, passing userId
      const response = await fetch(`/api/notifications?userId=${user.id}`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch notifications: ${response.statusText}`);
      }
      const data: Notification[] = await response.json();
      setNotifications(data); // API already sorts by createdAt desc
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
      setError(e instanceof Error ? e.message : 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
     if (!authLoading) { // Wait for auth to resolve
        if (isAuthenticated) {
            fetchNotifications();
        } else {
            setIsLoading(false);
            setError("Please log in to view notifications.");
        }
    }
  }, [authLoading, isAuthenticated, fetchNotifications]);

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    if (!user || !user.id) return;
    const newReadStatus = !currentReadStatus;
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: newReadStatus } : n))
    );
    try {
        const response = await fetch(`/api/notifications/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, isRead: newReadStatus })
        });
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update notification status.");
        }
        toast.success(`Notification marked as ${newReadStatus ? 'read' : 'unread'}.`);
    } catch (err) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: currentReadStatus } : n))); // Revert
        toast.error(err instanceof Error ? err.message : "Could not update notification.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !user.id) return;
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => n.id !== id)); // Optimistic update
    try {
        const response = await fetch(`/api/notifications/${id}?userId=${user.id}`, { method: 'DELETE' });
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete notification.");
        }
        toast.success("Notification deleted.");
    } catch (err) {
        setNotifications(originalNotifications); // Revert
        toast.error(err instanceof Error ? err.message : "Could not delete notification.");
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || !user.id || notifications.filter(n => !n.isRead).length === 0) return;
    const originalNotifications = notifications.map(n => ({...n}));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
        const response = await fetch(`/api/notifications`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, action: 'markAllRead' })
        });
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to mark all as read.");
        }
        toast.success("All notifications marked as read.");
    } catch (err) {
        setNotifications(originalNotifications); // Revert
        toast.error(err instanceof Error ? err.message : "Could not mark all as read.");
    }
  };
  
  const handleDeleteAll = async () => {
    if (!user || !user.id || notifications.length === 0) return;
    const originalNotifications = [...notifications];
    setNotifications([]);
     try {
        const response = await fetch(`/api/notifications?userId=${user.id}`, { method: 'DELETE' });
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete all notifications.");
        }
        toast.success("All notifications deleted.");
    } catch (err) {
        setNotifications(originalNotifications); // Revert
        toast.error(err instanceof Error ? err.message : "Could not delete all notifications.");
    }
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
            <Button variant="outline" onClick={handleMarkAllRead} disabled={notifications.filter(n => !n.isRead).length === 0}>Mark All as Read</Button>
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
              key={notification.id!} 
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
