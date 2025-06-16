
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Report } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag, AlertTriangle, Loader2, Eye, Info, Tag, FileText, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const ReportItemSkeleton = () => (
  <Card className="shadow-sm">
    <CardHeader className="pb-3">
      <Skeleton className="h-5 w-3/4 mb-1" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const ReportStatusBadge = ({ status }: { status: Report['status'] }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let text = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  switch (status) {
    case 'pending':
      variant = 'outline';
      break;
    case 'reviewed_action_taken':
      variant = 'destructive';
      break;
    case 'reviewed_no_action':
      variant = 'default'; // Using primary for "no action" as a neutral-positive resolution
      text = "Reviewed: No Action";
      break;
  }
  return <Badge variant={variant}>{text}</Badge>;
};

const ReportedItemIcon = ({ itemType }: { itemType: Report['itemType']}) => {
  switch (itemType) {
    case 'post':
      return <FileText className="h-4 w-4 mr-1.5 text-muted-foreground" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4 mr-1.5 text-muted-foreground" />;
    case 'user':
      return <User className="h-4 w-4 mr-1.5 text-muted-foreground" />;
    default:
      return <Info className="h-4 w-4 mr-1.5 text-muted-foreground" />;
  }
}

const ReportItem = ({ report }: { report: Report }) => {
  let itemLink = '#';
  if (report.itemType === 'post') {
    itemLink = `/posts/${report.reportedItemId}`;
  } else if (report.itemType === 'user') {
    itemLink = `/profile/${report.reportedItemId}`;
  }
  // Comment links are not implemented as comments don't have individual pages

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg font-headline flex items-center">
                    <ReportedItemIcon itemType={report.itemType} />
                    Report for {report.itemType}
                </CardTitle>
                <CardDescription className="text-xs">
                    Reported on: {format(new Date(report.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </CardDescription>
            </div>
            <ReportStatusBadge status={report.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <span className="font-semibold text-sm">Reason:</span>
          <Badge variant="secondary" className="ml-2 text-xs">{report.reasonCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge>
        </div>
        {report.reasonText && (
          <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
            <span className="font-medium text-foreground">Details:</span> {report.reasonText}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Reported Item ID: {' '}
          {report.itemType === 'post' || report.itemType === 'user' ? (
            <Link href={itemLink} className="text-primary hover:underline break-all">
              {report.reportedItemId.toString()}
            </Link>
          ) : (
            <span className="break-all">{report.reportedItemId.toString()}</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
};

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, isAuthenticated, router } = useAuth();

  const fetchMyReports = useCallback(async () => {
    if (!user || !user.id) {
      if (!authLoading) {
        setError("Please log in to view your reports.");
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports?userId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch reports: ${response.statusText}`);
      }
      const data: Report[] = await response.json();
      setReports(data);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
      setError(e instanceof Error ? e.message : 'Failed to load your reports.');
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchMyReports();
      } else {
        setIsLoading(false);
        setError("Please log in to view your reports.");
        router.push('/login?redirect=/my-reports');
      }
    }
  }, [authLoading, isAuthenticated, fetchMyReports, router]);

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Flag className="mr-3 h-7 w-7" /> My Submitted Reports
          </h1>
        </div>
        <div className="space-y-4">
          <ReportItemSkeleton />
          <ReportItemSkeleton />
        </div>
      </div>
    );
  }
  
  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md max-w-md mx-auto">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h2 className="font-semibold">Error Loading Reports</h2>
            <p className="text-sm">{error}</p>
            {error.includes("log in") && <Button onClick={() => router.push('/login?redirect=/my-reports')} className="mt-3">Login</Button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Flag className="mr-3 h-7 w-7" /> My Submitted Reports
        </h1>
      </div>

      {!error && reports.length === 0 && (
        <div className="text-center py-20 bg-card rounded-lg shadow-sm border border-dashed">
          <Flag className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-semibold mb-3">No Reports Submitted</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't reported any content yet. If you see something that violates community guidelines, please report it.
          </p>
        </div>
      )}

      {!error && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportItem key={report.id!} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
