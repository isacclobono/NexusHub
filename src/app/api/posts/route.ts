
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Post, User, Comment, Community, Notification } from '@/lib/types';
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Schema for validating POST request body
const postFormSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }),
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(50000, "Content can't exceed 50000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(), 
  isDraft: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  communityId: z.string().optional().refine(val => !val || ObjectId.isValid(val), { message: "Invalid Community ID format." }),
  media: z.array(z.object({ // Added media validation
    type: z.enum(['image', 'video', 'document']),
    url: z.string().url(),
    name: z.string().optional(),
  })).optional(),
});

// Define the structure of post documents in the database
type DbPost = Omit<Post, 'id' | 'author' | 'comments' | 'isLikedByCurrentUser' | 'isBookmarkedByCurrentUser' | 'authorId' | 'likedBy' | 'commentIds' | 'communityId' | 'communityName'> & {
  _id: ObjectId;
  authorId: ObjectId;
  likedBy: ObjectId[];
  commentIds: ObjectId[];
  communityId?: ObjectId;
};
type DbComment = Omit<Comment, 'id' | 'author' | 'authorId' | 'postId'> & {
  _id: ObjectId;
  authorId: ObjectId;
  postId: ObjectId;
};
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};
// User type for subscription queries
type DbUserWithSubscriptions = Omit<User, 'id'> & {
  _id: ObjectId;
  subscribedTags?: string[];
  subscribedCategories?: string[];
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = postFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid post data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<User>('users');
    const currentUserDoc = await usersCollection.findOne({ _id: new ObjectId(data.userId) }, {projection: {passwordHash: 0}});

    if (!currentUserDoc) {
        return NextResponse.json({ message: 'User not found. Cannot create post.' }, { status: 404 });
    }
    const currentUser: User = {...currentUserDoc, id: currentUserDoc._id!.toHexString(), bookmarkedPostIds: currentUserDoc.bookmarkedPostIds || [] };

    // Community check if communityId is provided
    let community: DbCommunity | null = null;
    if (data.communityId) {
        const communitiesCollection = db.collection<DbCommunity>('communities');
        community = await communitiesCollection.findOne({ _id: new ObjectId(data.communityId) });
        if (!community) {
            return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
        }
    }


    const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
    const moderationResult = await intelligentContentModeration(moderationInput);
    if (moderationResult.isFlagged && data.isDraft === false && !data.scheduledAt) { // Only block if not saving as draft or scheduling
      return NextResponse.json({
        message: `Post flagged by content moderation: ${moderationResult.reason}. Please revise.`,
        isFlagged: true,
        reason: moderationResult.reason,
      }, { status: 400 });
    }

    let finalCategory = data.category;
    let finalTagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    if (!finalCategory || finalTagsArray.length === 0) {
        const plainTextContent = data.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const categorizationInput: CategorizeContentInput = { content: plainTextContent || data.content };
        try {
            const categorizationResult = await categorizeContent(categorizationInput);
            if (!finalCategory && categorizationResult.category) {
                finalCategory = categorizationResult.category;
            }
            if (finalTagsArray.length === 0 && categorizationResult.tags && categorizationResult.tags.length > 0) {
                finalTagsArray = [...new Set([...finalTagsArray, ...categorizationResult.tags])];
            }
        } catch (aiError) {
            console.warn("AI categorization failed, proceeding with user input or defaults:", aiError);
        }
    }

    const newPostDocument: Omit<DbPost, '_id'> = {
      authorId: new ObjectId(data.userId),
      title: data.title,
      content: data.content,
      media: data.media,
      category: finalCategory,
      tags: finalTagsArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likedBy: [] as ObjectId[], 
      likeCount: 0,
      commentIds: [] as ObjectId[], 
      commentCount: 0,
      status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      ...(data.communityId && { communityId: new ObjectId(data.communityId) }),
    };

    const postsCollection = db.collection<Omit<DbPost, '_id'>>('posts'); 
    const result = await postsCollection.insertOne(newPostDocument);

    if (!result.insertedId) {
        throw new Error('Failed to insert post into database.');
    }
    
    const createdPostForClient: Post = {
        ...newPostDocument,
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        authorId: newPostDocument.authorId, 
        author: currentUser, 
        comments: [], 
        likedBy: [], 
        likeCount: 0,
        commentIds: [],
        commentCount: 0,
        isLikedByCurrentUser: false,
        isBookmarkedByCurrentUser: false,
        communityId: newPostDocument.communityId,
        communityName: community?.name,
    };

    // Notification Logic
    if (createdPostForClient.status === 'published') {
        const notificationsCollection = db.collection<Omit<Notification, '_id' | 'id'>>('notifications');
        const notificationsToInsert: Omit<Notification, '_id' | 'id'>[] = [];
        const notifiedUserIds = new Set<string>(); // To track users already set to be notified for this post

        // 1. Community Notifications
        if (createdPostForClient.communityId && community) {
            community.memberIds.forEach(memberId => {
                if (!memberId.equals(currentUser._id!) && !notifiedUserIds.has(memberId.toHexString())) {
                     notificationsToInsert.push({
                        userId: memberId,
                        type: 'new_community_post',
                        title: `New Post in ${community!.name}`,
                        message: `${currentUser.name} posted: "${createdPostForClient.title || 'a new post'}"`,
                        link: `/posts/${createdPostForClient.id}`,
                        relatedEntityId: createdPostForClient._id,
                        actor: {
                            _id: currentUser._id!,
                            id: currentUser.id!,
                            name: currentUser.name,
                            avatarUrl: currentUser.avatarUrl,
                        },
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    });
                    notifiedUserIds.add(memberId.toHexString());
                }
            });
        }

        // 2. Category Subscription Notifications
        if (createdPostForClient.category) {
            const usersSubscribedToCategory = await db.collection<DbUserWithSubscriptions>('users').find({
                subscribedCategories: createdPostForClient.category,
                _id: { $ne: currentUser._id! } // Exclude post author
            }).project({ _id: 1 }).toArray();

            usersSubscribedToCategory.forEach(subscribedUser => {
                if (!notifiedUserIds.has(subscribedUser._id.toHexString())) {
                    notificationsToInsert.push({
                        userId: subscribedUser._id,
                        type: 'new_post_subscribed_category',
                        title: `New Post in Subscribed Category: ${createdPostForClient.category}`,
                        message: `${currentUser.name} posted "${createdPostForClient.title || 'a new post'}" in a category you follow.`,
                        link: `/posts/${createdPostForClient.id}`,
                        relatedEntityId: createdPostForClient._id,
                        actor: { _id: currentUser._id!, id: currentUser.id!, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    });
                    notifiedUserIds.add(subscribedUser._id.toHexString());
                }
            });
        }

        // 3. Tag Subscription Notifications
        if (createdPostForClient.tags && createdPostForClient.tags.length > 0) {
            const usersSubscribedToTags = await db.collection<DbUserWithSubscriptions>('users').find({
                subscribedTags: { $in: createdPostForClient.tags },
                _id: { $ne: currentUser._id! } // Exclude post author
            }).project({ _id: 1, subscribedTags: 1 }).toArray(); // Fetch subscribedTags to find matched tag

            usersSubscribedToTags.forEach(subscribedUser => {
                if (!notifiedUserIds.has(subscribedUser._id.toHexString())) {
                    // Find which of the user's subscribed tags matched the post's tags
                    const matchedTag = subscribedUser.subscribedTags?.find(subTag => createdPostForClient.tags!.includes(subTag));
                    
                    notificationsToInsert.push({
                        userId: subscribedUser._id,
                        type: 'new_post_subscribed_tag',
                        title: `New Post with Tag: ${matchedTag || 'Subscribed Tag'}`,
                        message: `${currentUser.name} posted "${createdPostForClient.title || 'a new post'}" with a tag you follow${matchedTag ? ` (#${matchedTag})` : ''}.`,
                        link: `/posts/${createdPostForClient.id}`,
                        relatedEntityId: createdPostForClient._id,
                        actor: { _id: currentUser._id!, id: currentUser.id!, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    });
                    notifiedUserIds.add(subscribedUser._id.toHexString());
                }
            });
        }

        if (notificationsToInsert.length > 0) {
            await notificationsCollection.insertMany(notificationsToInsert);
        }
    }


    return NextResponse.json({ message: 'Post created successfully!', post: createdPostForClient }, { status: 201 });

  } catch (error) {
    console.error('API Error creating post:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');
    const commentsCollection = db.collection<DbComment>('comments');
    const communitiesCollection = db.collection<DbCommunity>('communities');
    
    const { searchParams } = new URL(request.url);
    const authorIdParam = searchParams.get('authorId');
    const bookmarkedByIdParam = searchParams.get('bookmarkedById');
    const forUserIdParam = searchParams.get('forUserId'); 
    const statusParam = searchParams.get('status'); 
    const communityIdParam = searchParams.get('communityId');


    let query: any = {}; 
    let currentUser: User | null = null;

    if (forUserIdParam && ObjectId.isValid(forUserIdParam)) {
        currentUser = await usersCollection.findOne({ _id: new ObjectId(forUserIdParam) });
    }


    if (bookmarkedByIdParam && ObjectId.isValid(bookmarkedByIdParam)) {
        const userWithBookmarks = await usersCollection.findOne({ _id: new ObjectId(bookmarkedByIdParam) });
        if (userWithBookmarks && userWithBookmarks.bookmarkedPostIds && userWithBookmarks.bookmarkedPostIds.length > 0) {
            query._id = { $in: userWithBookmarks.bookmarkedPostIds.map(id => new ObjectId(id)) };
        } else {
            return NextResponse.json([], { status: 200 }); 
        }
        query.status = 'published'; 
    } else if (authorIdParam && ObjectId.isValid(authorIdParam)) {
      query.authorId = new ObjectId(authorIdParam);
      if (statusParam && ['draft', 'scheduled', 'published'].includes(statusParam)) {
            query.status = statusParam;
        } else {
            // If fetching for a specific author AND the forUserIdParam matches authorId (viewing own profile posts),
            // include all statuses. Otherwise, default to published.
            if (forUserIdParam && forUserIdParam === authorIdParam) {
                 // No status filter, or $in: ['published', 'draft', 'scheduled'] if explicitly needed
            } else {
                query.status = 'published';
            }
        }
    } else if (communityIdParam && ObjectId.isValid(communityIdParam)) {
        query.communityId = new ObjectId(communityIdParam);
        query.status = 'published'; 
    }
     else { // General feed - apply privacy filtering
        query.status = 'published';
        const aggregationPipeline:any[] = [
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'authorDetails'
                }
            },
            { $unwind: '$authorDetails' },
            {
                $match: {
                    $or: [
                        { 'authorDetails.privacy': { $ne: 'private' } },
                        { 'authorDetails.privacy': { $exists: false } },
                        ...(currentUser ? [{ 'authorDetails._id': currentUser._id }] : []) // Allow viewing own private posts
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
             { $project: { authorDetails: 0 } } // Remove the looked-up authorDetails to avoid redundant data
        ];
        
        const postsFromDbViaAgg = await postsCollection.aggregate(aggregationPipeline).toArray();

        // The rest of the enrichment logic will apply to postsFromDbViaAgg
         const enrichedPostsViaAgg: Post[] = await Promise.all(
            postsFromDbViaAgg.map(async (postDoc: any) => {
                // PostDoc here is from aggregation, so authorDetails were used for filtering but not directly for author field.
                // We still need to fetch author for consistent Post structure.
                const authorDoc = await usersCollection.findOne({ _id: new ObjectId(postDoc.authorId) }, {projection: {passwordHash: 0}});
                const authorForClient: User | undefined = authorDoc ? {
                ...authorDoc,
                id: authorDoc._id.toHexString(),
                bookmarkedPostIds: Array.isArray(authorDoc.bookmarkedPostIds) ? authorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
                } : undefined;
                
                const recentCommentsDocs = await commentsCollection
                    .find({ postId: postDoc._id })
                    .sort({ createdAt: -1 })
                    .limit(2)
                    .toArray();

                const recentCommentsPopulated: Comment[] = await Promise.all(
                    recentCommentsDocs.map(async (commentDoc) => {
                        const commentAuthorDoc = await usersCollection.findOne({_id: commentDoc.authorId}, {projection: {passwordHash: 0}});
                        const caForClient: User | undefined = commentAuthorDoc ? {
                            ...commentAuthorDoc,
                            id: commentAuthorDoc._id.toHexString(),
                            bookmarkedPostIds: Array.isArray(commentAuthorDoc.bookmarkedPostIds) ? commentAuthorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
                        } : undefined;
                        return {
                            ...commentDoc,
                            id: commentDoc._id.toHexString(),
                            postId: commentDoc.postId,
                            authorId: commentDoc.authorId,
                            author: caForClient || { _id: commentDoc.authorId, id: commentDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
                        } as Comment;
                    })
                );
                
                const postLikedBy = Array.isArray(postDoc.likedBy) ? postDoc.likedBy : [];
                const isLikedByCurrentUser = currentUser && currentUser._id ? postLikedBy.some(id => id.equals(currentUser!._id!)) : false;
                
                const userBookmarkedPostIds = currentUser && Array.isArray(currentUser.bookmarkedPostIds) ? currentUser.bookmarkedPostIds : [];
                const isBookmarkedByCurrentUser = currentUser && postDoc._id ? userBookmarkedPostIds.some(id => id.equals(postDoc._id)) : false;

                let communityName: string | undefined = undefined;
                if (postDoc.communityId) {
                    const community = await communitiesCollection.findOne({ _id: postDoc.communityId });
                    communityName = community?.name;
                }

                return {
                ...postDoc,
                id: postDoc._id.toHexString(),
                authorId: postDoc.authorId, 
                author: authorForClient || { _id: postDoc.authorId, id: postDoc.authorId.toHexString(), name: 'Unknown User', email:'', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds:[] } as User,
                likedBy: postLikedBy.map(id => new ObjectId(id.toString())),
                likeCount: postDoc.likeCount || 0,
                isLikedByCurrentUser,
                commentIds: Array.isArray(postDoc.commentIds) ? postDoc.commentIds.map((id: ObjectId | string) => typeof id === 'string' ? new ObjectId(id) : id) : [],
                comments: recentCommentsPopulated.reverse(), 
                commentCount: postDoc.commentCount || 0,
                isBookmarkedByCurrentUser,
                communityId: postDoc.communityId,
                communityName: communityName,
                } as Post;
            })
        );
        return NextResponse.json(enrichedPostsViaAgg, { status: 200 });
    }


    const postsFromDb = await postsCollection.find(query).sort({ createdAt: -1 }).toArray();

    const enrichedPosts: Post[] = await Promise.all(
      postsFromDb.map(async (postDoc) => {
        const authorDoc = await usersCollection.findOne({ _id: new ObjectId(postDoc.authorId) }, {projection: {passwordHash: 0}});
        
        const authorForClient: User | undefined = authorDoc ? {
          ...authorDoc,
          id: authorDoc._id.toHexString(),
          bookmarkedPostIds: Array.isArray(authorDoc.bookmarkedPostIds) ? authorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        } : undefined;
        
        
        const recentCommentsDocs = await commentsCollection
            .find({ postId: postDoc._id })
            .sort({ createdAt: -1 })
            .limit(2)
            .toArray();

        const recentCommentsPopulated: Comment[] = await Promise.all(
            recentCommentsDocs.map(async (commentDoc) => {
                const commentAuthorDoc = await usersCollection.findOne({_id: commentDoc.authorId}, {projection: {passwordHash: 0}});
                const caForClient: User | undefined = commentAuthorDoc ? {
                    ...commentAuthorDoc,
                    id: commentAuthorDoc._id.toHexString(),
                    bookmarkedPostIds: Array.isArray(commentAuthorDoc.bookmarkedPostIds) ? commentAuthorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
                } : undefined;
                return {
                    ...commentDoc,
                    id: commentDoc._id.toHexString(),
                    postId: commentDoc.postId,
                    authorId: commentDoc.authorId,
                    author: caForClient || { _id: commentDoc.authorId, id: commentDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
                } as Comment;
            })
        );
        
        const postLikedBy = Array.isArray(postDoc.likedBy) ? postDoc.likedBy : [];
        const isLikedByCurrentUser = currentUser && currentUser._id ? postLikedBy.some(id => id.equals(currentUser!._id!)) : false;
        
        const userBookmarkedPostIds = currentUser && Array.isArray(currentUser.bookmarkedPostIds) ? currentUser.bookmarkedPostIds : [];
        const isBookmarkedByCurrentUser = currentUser && postDoc._id ? userBookmarkedPostIds.some(id => id.equals(postDoc._id)) : false;

        let communityName: string | undefined = undefined;
        if (postDoc.communityId) {
            const community = await communitiesCollection.findOne({ _id: postDoc.communityId });
            communityName = community?.name;
        }


        return {
          ...postDoc,
          id: postDoc._id.toHexString(),
          authorId: postDoc.authorId, 
          author: authorForClient || { _id: postDoc.authorId, id: postDoc.authorId.toHexString(), name: 'Unknown User', email:'', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds:[] } as User,
          likedBy: postLikedBy.map(id => new ObjectId(id.toString())),
          likeCount: postDoc.likeCount || 0,
          isLikedByCurrentUser,
          commentIds: Array.isArray(postDoc.commentIds) ? postDoc.commentIds.map((id: ObjectId | string) => typeof id === 'string' ? new ObjectId(id) : id) : [],
          comments: recentCommentsPopulated.reverse(), 
          commentCount: postDoc.commentCount || 0,
          isBookmarkedByCurrentUser,
          communityId: postDoc.communityId,
          communityName: communityName,
        } as Post;
      })
    );

    return NextResponse.json(enrichedPosts, { status: 200 });
  } catch (error) {
    console.error('API Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while fetching posts.';
    return NextResponse.json({ message: errorMessage, posts: [], comments: [] }, { status: 500 });
  }
}

