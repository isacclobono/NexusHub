
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Post, User } from '@/lib/types';

interface VoteParams {
  params: { postId: string };
}

// Define the structure of post documents in the database for this route
type DbPost = Omit<Post, 'id' | 'author' | 'comments' | 'isLikedByCurrentUser' | 'isBookmarkedByCurrentUser' | 'authorId' | 'likedBy' | 'commentIds' | 'communityId' | 'communityName' | 'pollOptions' | 'userVotedOptionId'> & {
  _id: ObjectId;
  authorId: ObjectId;
  likedBy: ObjectId[];
  commentIds: ObjectId[];
  communityId?: ObjectId;
  pollOptions?: { _id: ObjectId; optionText: string; votes: number; votedBy?: ObjectId[] }[];
  totalVotes?: number;
};


async function getFullPostForClient(db: any, postId: ObjectId, currentAuthUserId?: ObjectId): Promise<Post | null> {
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');
    const commentsCollection = db.collection('comments'); // Simplified for now
    const communitiesCollection = db.collection('communities');

    const postDoc = await postsCollection.findOne({ _id: postId });
    if (!postDoc) return null;

    const authorDoc = await usersCollection.findOne({ _id: postDoc.authorId }, { projection: { passwordHash: 0 } });
    const authorForClient: User | undefined = authorDoc ? { ...authorDoc, id: authorDoc._id.toHexString() } : undefined;

    let communityName: string | undefined = undefined;
    if (postDoc.communityId) {
        const community = await communitiesCollection.findOne({ _id: postDoc.communityId });
        communityName = community?.name;
    }
    
    let userVotedOptionIdComputed: string | ObjectId | undefined = undefined;
    if (postDoc.postType === 'poll' && currentAuthUserId && postDoc.pollOptions) {
        for (const option of postDoc.pollOptions) {
            if (option.votedBy?.some((voterId: ObjectId) => voterId.equals(currentAuthUserId))) {
                userVotedOptionIdComputed = option._id;
                break;
            }
        }
    }

    // Basic comments, likes, bookmarks status (could be expanded as in other routes)
    const isLikedByCurrentUser = currentAuthUserId ? postDoc.likedBy.some(id => id.equals(currentAuthUserId)) : false;
    let isBookmarkedByCurrentUser = false;
    if (currentAuthUserId) {
        const currentUserDoc = await usersCollection.findOne({_id: currentAuthUserId});
        isBookmarkedByCurrentUser = currentUserDoc?.bookmarkedPostIds?.some((id: ObjectId) => id.equals(postDoc._id)) || false;
    }


    const clientPost: Post = {
      ...postDoc,
      id: postDoc._id.toHexString(),
      author: authorForClient || { _id: postDoc.authorId, id: postDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() } as User,
      communityName,
      isLikedByCurrentUser,
      isBookmarkedByCurrentUser,
      // Convert pollOptions to client-friendly format
      pollOptions: postDoc.pollOptions?.map(opt => ({
        ...opt,
        id: opt._id.toHexString(), // Ensure client gets string ID for option
        // votedBy is typically not sent to client for privacy/brevity
        votedBy: undefined, // Explicitly remove for client
      })),
      userVotedOptionId: userVotedOptionIdComputed,
      comments: [], // For simplicity, not populating all comments here
      commentCount: postDoc.commentCount || 0,
    };
    return clientPost;
}


export async function POST(request: NextRequest, { params }: VoteParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    const { userId, optionId } = await request.json();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }
    if (!optionId || !ObjectId.isValid(optionId)) {
      return NextResponse.json({ message: 'Valid Poll Option ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');


    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);
    const optionObjectId = new ObjectId(optionId);

    const post = await postsCollection.findOne({ _id: postObjectId });
    if (!post) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }
    if (post.postType !== 'poll' || !post.pollOptions) {
      return NextResponse.json({ message: 'This post is not a poll or has no options.' }, { status: 400 });
    }
    
    const userExists = await usersCollection.countDocuments({_id: userObjectId});
    if(!userExists){
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Check if user has already voted
    const alreadyVoted = post.pollOptions.some(opt => opt.votedBy?.some(voterId => voterId.equals(userObjectId)));
    if (alreadyVoted) {
      const clientPost = await getFullPostForClient(db, postObjectId, userObjectId);
      return NextResponse.json({ message: 'You have already voted in this poll.', post: clientPost }, { status: 409 });
    }

    const optionToUpdate = post.pollOptions.find(opt => opt._id.equals(optionObjectId));
    if (!optionToUpdate) {
      return NextResponse.json({ message: 'Poll option not found.' }, { status: 404 });
    }
    
    const updateResult = await postsCollection.updateOne(
      { _id: postObjectId, "pollOptions._id": optionObjectId },
      {
        $inc: {
          "pollOptions.$.votes": 1,
          totalVotes: 1,
        },
        $addToSet: { "pollOptions.$.votedBy": userObjectId },
        $set: { updatedAt: new Date().toISOString() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      // This could happen if the optionId was wrong or some race condition, though less likely with findOne check.
      const clientPost = await getFullPostForClient(db, postObjectId, userObjectId);
      return NextResponse.json({ message: 'Failed to record vote. Please try again.', post: clientPost }, { status: 500 });
    }
    
    const updatedClientPost = await getFullPostForClient(db, postObjectId, userObjectId);
    return NextResponse.json({ message: 'Vote recorded successfully!', post: updatedClientPost }, { status: 200 });

  } catch (error) {
    console.error(`API Error voting on poll for post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
