
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';
import crypto from 'crypto'; // For generating a secure token

// Define the structure of User documents in DB for this route specifically
interface DbUser extends Omit<User, 'id'> {
  _id: ObjectId;
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = requestResetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Invalid email provided.", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { email } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<DbUser>('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      // To prevent email enumeration, always return a success-like message.
      // Actual email sending would only happen if user exists.
      console.log(`Password reset request for non-existent email: ${email}`);
      return NextResponse.json({ message: "If an account with that email exists, password reset instructions have been sent (simulated)." }, { status: 200 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex'); // More secure token
    const resetTokenExpiry = new Date(Date.now() + 3600000); // Token valid for 1 hour

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry,
          updatedAt: new Date().toISOString(),
        }
      }
    );

    // **** SIMULATION OF EMAIL SENDING ****
    // In a real application, you would send an email to user.email with a link like:
    // const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;
    // sendEmail(user.email, "Password Reset Request", `Click here to reset your password: ${resetUrl}`);
    
    console.log(`Password Reset Requested for ${user.email}.`);
    console.log(`SIMULATED: Email would be sent with token (or link containing it).`);
    console.log(`DEVELOPMENT ONLY - Reset Token: ${resetToken}`);
    // For development, we can return the token or a pre-formed link.
    // DO NOT do this in production if actual emails are sent.
    return NextResponse.json({ 
      message: "Password reset instructions have been processed (simulated). Check your email (or console for dev token).",
      resetTokenForDev: resetToken // Sending token back for dev purposes only
    }, { status: 200 });

  } catch (error) {
    console.error('Password Reset Request API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: `Server error: ${errorMessage}` }, { status: 500 });
  }
}
