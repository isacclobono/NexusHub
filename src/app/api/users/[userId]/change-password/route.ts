
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';

// Server-side user document type including passwordHash
interface UserWithPasswordHash extends Omit<User, 'id'> {
  _id: ObjectId;
  passwordHash: string;
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});


export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;

  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { currentPassword, newPassword } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    const userObjectId = new ObjectId(userId);

    const userDoc = await usersCollection.findOne({ _id: userObjectId });

    if (!userDoc) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (!userDoc.passwordHash) {
        return NextResponse.json({ message: 'Password not set for this account. Cannot change.' }, { status: 400 });
    }

    const currentPasswordIsValid = await bcrypt.compare(currentPassword, userDoc.passwordHash);

    if (!currentPasswordIsValid) {
      return NextResponse.json({ message: 'Incorrect current password.' }, { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $set: { passwordHash: newPasswordHash, updatedAt: new Date().toISOString() } }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ message: 'Failed to update password. It might be the same as the old one.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password updated successfully!' }, { status: 200 });

  } catch (error) {
    console.error(`API Error changing password for user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
