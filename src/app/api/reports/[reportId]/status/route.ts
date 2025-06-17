
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Report, Notification, User, Post as PostType, Comment as CommentType } from '@/lib/types'; // Ensure PostType and CommentType are imported

const reportStatusUpdateSchema = z.object({
  newStatus: z.enum(['reviewed_action_taken', 'reviewed_no_action']),
  reviewerId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Reviewer User ID format." }),
  reviewNotes: z.string().max(1000, "Review notes cannot exceed 1000 characters.").optional(),
});

interface ReportStatusParams {
  params: { reportId: string };
}

export async function PATCH(request: NextRequest, { params }: ReportStatusParams) {
  const { reportId } = params;

  if (!reportId || !ObjectId.isValid(reportId)) {
    return NextResponse.json({ message: 'Valid Report ID is required in the path.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = reportStatusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { newStatus, reviewerId, reviewNotes } = validation.data;

    const db = await getDb();
    const reportsCollection = db.collection<Report>('reports');
    const notificationsCollection = db.collection<Omit<Notification, '_id' | 'id'>>('notifications');
    const usersCollection = db.collection<User>('users');
    const postsCollection = db.collection<PostType>('posts');
    // const commentsCollection = db.collection<CommentType>('comments'); // If we need comment details

    const reportObjectId = new ObjectId(reportId);
    const report = await reportsCollection.findOne({ _id: reportObjectId });

    if (!report) {
      return NextResponse.json({ message: 'Report not found.' }, { status: 404 });
    }

    if (report.status !== 'pending') {
        return NextResponse.json({ message: `Report already ${report.status.replace('_', ' ')}. Cannot update again.` }, { status: 409 });
    }

    const reviewerObjectId = new ObjectId(reviewerId);
    const reviewer = await usersCollection.findOne({ _id: reviewerObjectId }, { projection: { passwordHash: 0 } });
    if (!reviewer) {
        return NextResponse.json({ message: 'Reviewer user not found.' }, { status: 404 });
    }
    
    // Simulate admin check - in a real app, check if reviewerId has admin/mod roles
    // For now, we assume if a reviewerId is provided and valid, it's an authorized action.

    const updateResult = await reportsCollection.updateOne(
      { _id: reportObjectId },
      {
        $set: {
          status: newStatus,
          reviewedAt: new Date().toISOString(),
          reviewerId: reviewerObjectId,
          ...(reviewNotes && { reviewNotes }),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'Report not found for update (race condition or already deleted).' }, { status: 404 });
    }
    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ message: 'Report status was not changed (already set or no effective change).' }, { status: 200 });
    }

    // Create Notification for the original reporter
    let itemPreview = report.itemType;
    let itemLink: string | undefined = undefined;

    if (report.itemType === 'post') {
      const post = await postsCollection.findOne({ _id: report.reportedItemId });
      itemPreview = post?.title ? `post "${post.title.substring(0, 30)}..."` : 'a post';
      itemLink = post ? `/posts/${post._id.toHexString()}` : undefined;
    } else if (report.itemType === 'comment') {
      // For simplicity, not fetching full comment content. Could be enhanced.
      itemPreview = 'a comment';
      itemLink = `/posts/${report.reportedItemId.toString()}`; // Link to the post containing the comment for now
    } else if (report.itemType === 'user') {
      const reportedUser = await usersCollection.findOne({ _id: report.reportedItemId });
      itemPreview = reportedUser ? `user "${reportedUser.name}"` : 'a user';
      itemLink = reportedUser ? `/profile/${reportedUser._id.toHexString()}` : undefined;
    }
    
    const notificationTitle = newStatus === 'reviewed_action_taken' ? 'Report Resolved: Action Taken' : 'Report Resolved: No Action Needed';
    const notificationMessage = `Your report regarding ${itemPreview} has been reviewed. ${newStatus === 'reviewed_action_taken' ? 'Appropriate action has been taken by our team.' : 'After review, no violations of our guidelines were found at this time.'}`;
    
    const notification: Omit<Notification, '_id' | 'id'> = {
      userId: report.reporterUserId,
      type: newStatus, // 'report_reviewed_action_taken' or 'report_reviewed_no_action'
      title: notificationTitle,
      message: notificationMessage,
      link: itemLink,
      relatedEntityId: report._id, // Link notification to the report itself
      actor: { // The actor is the admin/reviewer
        _id: reviewer._id!,
        id: reviewer.id!,
        name: reviewer.name,
        avatarUrl: reviewer.avatarUrl,
      },
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await notificationsCollection.insertOne(notification);

    const updatedReport = await reportsCollection.findOne({ _id: reportObjectId });

    return NextResponse.json({ message: `Report status updated to ${newStatus}. Notification sent to reporter.`, report: updatedReport }, { status: 200 });

  } catch (error) {
    console.error(`API Error updating report ${reportId} status:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

