
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';

interface DbUser extends Omit<User, 'id'> {
  _id: ObjectId;
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const confirmResetSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters long."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = confirmResetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Invalid data provided.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { token, newPassword } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<DbUser>('users');

    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() } // Check if token is not expired
    });

    if (!user) {
      return NextResponse.json({ message: "Password reset token is invalid or has expired." }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          updatedAt: new Date().toISOString(),
        },
        $unset: { // Clear the reset token fields
          resetPasswordToken: "",
          resetPasswordExpires: ""
        }
      }
    );

    // Optionally, log the user out of other sessions if that's desired (more complex).

    return NextResponse.json({ message: "Your password has been successfully reset. Please log in with your new password." }, { status: 200 });

  } catch (error) {
    console.error('Password Reset Confirm API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: `Server error: ${errorMessage}` }, { status: 500 });
  }
}
