
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';

// Interface for user document in DB, potentially including passwordHash
interface UserWithSensitiveFields extends Omit<User, 'id' | 'bookmarkedPostIds'> {
  _id: ObjectId;
  passwordHash?: string; 
  bookmarkedPostIds?: ObjectId[]; 
  notificationPreferences?: {
    emailNewPosts?: boolean;
    eventReminders?: boolean;
    mentionNotifications?: boolean;
  };
  privacy?: 'public' | 'private';
  updatedAt?: string;
  resetPasswordToken?: string; // Added for completeness of DB model
  resetPasswordExpires?: Date; // Added for completeness of DB model
  subscribedTags?: string[];
  subscribedCategories?: string[];
}

interface UserParams {
  params: { userId: string };
}

// Zod schema for validating profile update data
const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters.").optional(),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional().nullable(),
  avatarUrl: z.string().url("Please enter a valid URL for your avatar.").optional().nullable().or(z.literal('')),
  notificationPreferences: z.object({
    emailNewPosts: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
    mentionNotifications: z.boolean().optional(),
  }).optional(),
  privacy: z.enum(['public', 'private']).optional(),
  subscribedTags: z.array(z.string()).optional(),
  subscribedCategories: z.array(z.string()).optional(),
});


export async function GET(request: NextRequest, { params }: UserParams) {
  const { userId } = params;

  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requestingUserId = searchParams.get('forUserId'); 

  try {
    const db = await getDb();
    const usersCollection = db.collection<UserWithSensitiveFields>('users');

    const userDoc = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      // Exclude sensitive fields like passwordHash, reset tokens
      { projection: { passwordHash: 0, resetPasswordToken: 0, resetPasswordExpires: 0 } } 
    );

    if (!userDoc) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const isOwnerViewing = requestingUserId && userDoc._id.toHexString() === requestingUserId;

    if (userDoc.privacy === 'private' && !isOwnerViewing) {
      const privateUserForClient: User = {
        id: userDoc._id.toHexString(),
        _id: userDoc._id,
        name: userDoc.name, // Or a placeholder like "Private User"
        email: '', // Add missing email property
        avatarUrl: userDoc.avatarUrl, // Or a default placeholder avatar
        privacy: 'private',
        isPrivatePlaceholder: true, 
        reputation: 0, 
        joinedDate: userDoc.joinedDate, // Consider if joinedDate should also be hidden or generalized
      };
      return NextResponse.json(privateUserForClient, { status: 200 });
    }

    const userForClient: User = {
      ...userDoc,
      id: userDoc._id.toHexString(),
      bookmarkedPostIds: Array.isArray(userDoc.bookmarkedPostIds) ? userDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
      notificationPreferences: userDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false }, 
      privacy: userDoc.privacy || 'public',
      subscribedTags: userDoc.subscribedTags || [],
      subscribedCategories: userDoc.subscribedCategories || [],
    };

    return NextResponse.json(userForClient, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: UserParams) {
  const { userId: pathUserId } = params;

  if (!pathUserId || !ObjectId.isValid(pathUserId)) {
    return NextResponse.json({ message: 'Valid User ID in path is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid profile data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const validatedData = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithSensitiveFields>('users');
    const userObjectId = new ObjectId(pathUserId);

    const existingUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { name: 1, avatarUrl: 1, notificationPreferences: 1, privacy: 1, subscribedTags: 1, subscribedCategories: 1 } }); 
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    const updatePayloadSet: Partial<Omit<UserWithSensitiveFields, '_id' | 'passwordHash' | 'resetPasswordToken' | 'resetPasswordExpires'>> & { updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };
     const updatePayloadUnset: Partial<Record<keyof Pick<UserWithSensitiveFields, 'subscribedTags' | 'subscribedCategories' | 'bio' | 'avatarUrl'>, string>> = {};


    if (validatedData.name !== undefined) {
      updatePayloadSet.name = validatedData.name;
    }
    
    if (validatedData.bio !== undefined) { 
        if (validatedData.bio === null || validatedData.bio === '') {
            updatePayloadUnset.bio = "";
        } else {
            updatePayloadSet.bio = validatedData.bio;
        }
    }

    if (validatedData.avatarUrl !== undefined) { 
      if (validatedData.avatarUrl === null || validatedData.avatarUrl === '') {
        const finalNameForAvatar = validatedData.name !== undefined ? validatedData.name : existingUser.name;
        updatePayloadSet.avatarUrl = `https://placehold.co/100x100.png?text=${(finalNameForAvatar || 'U').charAt(0)}`;
      } else {
        updatePayloadSet.avatarUrl = validatedData.avatarUrl;
      }
    }

    if (validatedData.notificationPreferences !== undefined) {
      updatePayloadSet.notificationPreferences = {
        emailNewPosts: validatedData.notificationPreferences.emailNewPosts ?? existingUser.notificationPreferences?.emailNewPosts ?? true,
        eventReminders: validatedData.notificationPreferences.eventReminders ?? existingUser.notificationPreferences?.eventReminders ?? true,
        mentionNotifications: validatedData.notificationPreferences.mentionNotifications ?? existingUser.notificationPreferences?.mentionNotifications ?? false,
      };
    }

    if (validatedData.privacy !== undefined) {
      updatePayloadSet.privacy = validatedData.privacy;
    }
    
    if (validatedData.subscribedTags !== undefined) {
      updatePayloadSet.subscribedTags = validatedData.subscribedTags;
    }
    if (validatedData.subscribedCategories !== undefined) {
      updatePayloadSet.subscribedCategories = validatedData.subscribedCategories;
    }
    
    const updateOperation: { $set: any, $unset?: any } = { $set: updatePayloadSet };
    if (Object.keys(updatePayloadUnset).length > 0) {
        updateOperation.$unset = updatePayloadUnset;
    }
        
    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      updateOperation
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found during update operation. No changes made.' }, { status: 404 });
    }
    
    const updatedUserDoc = await usersCollection.findOne(
        { _id: userObjectId },
        { projection: { passwordHash: 0, resetPasswordToken: 0, resetPasswordExpires: 0 } }
    );

    if (!updatedUserDoc) {
        console.error(`[API User PUT] User ${pathUserId} was matched for update, but could not be re-fetched.`);
        
        const hasMeaningfulUpdates = Object.keys(updatePayloadSet).some(key => 
          key !== 'updatedAt' && (updatePayloadSet as any)[key] !== undefined
        );

        if (updateResult.modifiedCount > 0 || (updateResult.matchedCount > 0 && hasMeaningfulUpdates) ) {
             return NextResponse.json({ message: 'Profile update successful, but failed to re-fetch latest user details.' }, { status: 200 });
        }
        
        return NextResponse.json({ message: 'Profile update operation failed. The document might not have been modified or an unexpected error occurred.' }, { status: 500 });
    }

    const updatedUserForClient: User = {
        ...updatedUserDoc,
        id: updatedUserDoc._id.toHexString(),
        bookmarkedPostIds: Array.isArray(updatedUserDoc.bookmarkedPostIds) ? updatedUserDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        notificationPreferences: updatedUserDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
        privacy: updatedUserDoc.privacy || 'public',
        subscribedTags: updatedUserDoc.subscribedTags || [],
        subscribedCategories: updatedUserDoc.subscribedCategories || [],
    };

    return NextResponse.json({ message: 'Profile updated successfully!', user: updatedUserForClient }, { status: 200 });

  } catch (error) {
    console.error(`[API User PUT Error] Error updating user ${pathUserId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during profile update.';
    if (error instanceof Error && (error.message.toLowerCase().includes("input must be a 24 character hex string") || error.message.toLowerCase().includes("invalid objectid"))) {
        return NextResponse.json({ message: 'Invalid User ID format provided in path.' }, { status: 400 });
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

