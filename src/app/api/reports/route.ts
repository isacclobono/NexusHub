
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Report, ReportReasonCategory } from '@/lib/types';

const reportReasonCategories: [ReportReasonCategory, ...ReportReasonCategory[]] = [
  'spam',
  'harassment',
  'hate_speech',
  'inappropriate_content',
  'misinformation',
  'intellectual_property',
  'other',
];

const reportCreateSchema = z.object({
  itemId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Item ID format." }),
  itemType: z.enum(['post', 'comment', 'user']),
  reporterUserId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Reporter User ID format." }),
  reasonCategory: z.enum(reportReasonCategories),
  reasonText: z.string().max(1000, "Reason text cannot exceed 1000 characters.").optional(),
}).refine(data => {
  if (data.reasonCategory === 'other' && (!data.reasonText || data.reasonText.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Please provide details if you select 'Other' as the reason.",
  path: ["reasonText"],
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = reportCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid report data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const db = await getDb();
    const reportsCollection = db.collection<Omit<Report, '_id' | 'id'>>('reports');
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('posts');
    // const commentsCollection = db.collection('comments'); // If/when comment reporting is added

    // Validate reporter user exists
    const reporterExists = await usersCollection.countDocuments({ _id: new ObjectId(data.reporterUserId) });
    if (reporterExists === 0) {
      return NextResponse.json({ message: 'Reporter user not found.' }, { status: 404 });
    }

    // Validate reported item exists (basic check for post for now)
    if (data.itemType === 'post') {
      const itemExists = await postsCollection.countDocuments({ _id: new ObjectId(data.itemId) });
      if (itemExists === 0) {
        return NextResponse.json({ message: 'Reported post not found.' }, { status: 404 });
      }
    }
    // Add similar checks for comments or users if itemType is extended

    const newReportDocument: Omit<Report, '_id' | 'id'> = {
      reportedItemId: new ObjectId(data.itemId),
      itemType: data.itemType,
      reporterUserId: new ObjectId(data.reporterUserId),
      reasonCategory: data.reasonCategory,
      reasonText: data.reasonText,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const result = await reportsCollection.insertOne(newReportDocument);

    if (!result.insertedId) {
      throw new Error('Failed to submit report to database.');
    }
    
    // In a full system, you might notify admins/moderators here.
    // For now, we just confirm submission.

    return NextResponse.json({ message: 'Report submitted successfully. Thank you for helping keep our community safe.', reportId: result.insertedId.toHexString() }, { status: 201 });

  } catch (error) {
    console.error('API Error submitting report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
