# NexusHub API Documentation

## 1. Introduction
This document provides details on the Application Programming Interfaces (APIs) available for the NexusHub platform. These APIs are used by the frontend to interact with backend services.

## 2. Base URL
All API endpoints are prefixed with `/api`.
Example: `https://your-nexushub-domain.com/api/posts`

## 3. Authentication
- Most endpoints require authentication.
- The current implementation simulates session management via client-side `sessionStorage` after successful login. The user's ID (`userId`) is typically passed in the request body or query parameters for authenticated actions.
- **Production Recommendation:** Implement robust JWT (JSON Web Tokens) or OAuth 2.0 for secure authentication.

## 4. Common Response Formats
### Success Response
```json
{
  "message": "Operation successful!",
  "data": { /* Resource-specific data */ }
}
```
Or directly the resource/list of resources.

### Error Response
```json
{
  "message": "Error message describing the issue.",
  "errors": { /* Optional: Field-specific validation errors */ }
}
```
HTTP Status Codes are used appropriately (e.g., 200, 201, 400, 401, 403, 404, 500).

## 5. Rate Limiting
(Not yet implemented, but recommended for production to prevent abuse.)

## 6. API Endpoints

---
### **Users**
---
- **`POST /api/register`**
  - Description: Registers a new user.
  - Request Body: `{ name, email, password }`
  - Response: `{ message, user }`
- **`POST /api/login`**
  - Description: Logs in an existing user.
  - Request Body: `{ email, password }`
  - Response: `{ message, user }`
- **`GET /api/users`**
  - Description: Retrieves a list of public users.
  - Response: `User[]`
- **`GET /api/users/{userId}`**
  - Description: Retrieves a specific user's profile.
  - Query Params: `forUserId` (optional, ID of the requesting user for privacy checks).
  - Response: `User`
- **`PUT /api/users/{userId}`**
  - Description: Updates a specific user's profile. Requires authentication as the target user.
  - Request Body: Profile update fields (e.g., `name`, `bio`, `avatarUrl`, `notificationPreferences`, `privacy`, `subscribedTags`, `subscribedCategories`).
  - Response: `{ message, user }`
- **`POST /api/users/{userId}/change-password`**
  - Description: Changes the password for the authenticated user.
  - Request Body: `{ currentPassword, newPassword }`
  - Response: `{ message }`
- **`GET /api/users/{userId}/comments`**
  - Description: Retrieves comments made by a specific user.
  - Response: `Comment[]`

---
### **Password Reset**
---
- **`POST /api/password-reset/request`**
  - Description: Initiates a password reset request for an email.
  - Request Body: `{ email }`
  - Response: `{ message, resetTokenForDev (dev only) }`
- **`POST /api/password-reset/confirm`**
  - Description: Confirms password reset using a token.
  - Request Body: `{ token, newPassword }`
  - Response: `{ message }`

---
### **Posts**
---
- **`POST /api/posts`**
  - Description: Creates a new post (standard, poll).
  - Request Body: `{ userId, title?, content, category?, tags?, isDraft?, scheduledAt?, communityId?, media?, postType?, pollOptions? }`
  - Response: `{ message, post }`
- **`GET /api/posts`**
  - Description: Retrieves a list of posts.
  - Query Params: `authorId?`, `bookmarkedById?`, `forUserId?`, `status?`, `communityId?`
  - Response: `Post[]`
- **`GET /api/posts/{postId}`**
  - Description: Retrieves a specific post.
  - Query Params: `forUserId?`
  - Response: `Post`
- **`PUT /api/posts/{postId}`**
  - Description: Updates a specific post. Requires authentication as post author.
  - Request Body: Post update fields (e.g., `userId`, `title`, `content`, `category`, `tags`, `communityId`, `status`, `scheduledAt`, `media`).
  - Response: `{ message, post }` or `{ message, isFlagged, reason }` if moderated.
- **`DELETE /api/posts/{postId}`**
  - Description: Deletes a specific post. Requires authentication as post author.
  - Query Params: `userId` (for authorization).
  - Response: `{ message }`
- **`POST /api/posts/{postId}/like`**
  - Description: Likes a post.
  - Request Body: `{ userId }`
  - Response: `{ message, post }`
- **`DELETE /api/posts/{postId}/like`**
  - Description: Unlikes a post.
  - Query Params: `userId`
  - Response: `{ message, post }`
- **`POST /api/posts/{postId}/bookmark`**
  - Description: Bookmarks a post.
  - Request Body: `{ userId }`
  - Response: `{ message }`
- **`POST /api/posts/{postId}/unbookmark`**
  - Description: Unbookmarks a post.
  - Request Body: `{ userId }`
  - Response: `{ message }`
- **`POST /api/posts/{postId}/comments`**
  - Description: Adds a comment to a post.
  - Request Body: `{ userId, content, parentId? }`
  - Response: `{ message, comment }`
- **`GET /api/posts/{postId}/comments`**
  - Description: Retrieves comments for a specific post.
  - Response: `Comment[]`
- **`POST /api/posts/{postId}/vote`**
  - Description: Submits a vote for a poll option.
  - Request Body: `{ userId, optionId }`
  - Response: `{ message, post }`

---
### **Events**
---
- **`POST /api/events`**
  - Description: Creates a new event.
  - Request Body: Event details (e.g., `organizerId`, `title`, `description`, `startTime`, `endTime`, `location`, `communityId?`, `price?`).
  - Response: `{ message, event }`
- **`GET /api/events`**
  - Description: Retrieves a list of events.
  - Query Params: `organizerId?`, `rsvpdBy?`, `communityId?`
  - Response: `Event[]`
- **`GET /api/events/{eventId}`**
  - Description: Retrieves a specific event.
  - Response: `Event`
- **`PUT /api/events/{eventId}`**
  - Description: Updates an event. Requires authentication as event organizer.
  - Request Body: Event update fields (e.g., `userId`, `title`, `description`, `startTime`, `endTime`).
  - Response: `Event` (updated event) or error message.
- **`DELETE /api/events/{eventId}`**
  - Description: Deletes an event. Requires authentication as event organizer.
  - Request Body: `{ userId }`
  - Response: `{ message }`
- **`POST /api/events/{eventId}/rsvp`**
  - Description: RSVPs the authenticated user to an event.
  - Request Body: `{ userId }`
  - Response: `{ message, event }`

---
### **Communities**
---
- **`POST /api/communities`**
  - Description: Creates a new community.
  - Request Body: `{ creatorId, name, description, privacy, coverImageUrl? }`
  - Response: `{ message, community }`
- **`GET /api/communities`**
  - Description: Retrieves a list of public communities.
  - Response: `Community[]`
- **`GET /api/communities/{communityId}`**
  - Description: Retrieves a specific community.
  - Response: `Community`
- **`PUT /api/communities/{communityId}`**
  - Description: Updates a community. Requires authentication as community creator.
  - Request Body: Community update fields (e.g., `userId`, `name`, `description`, `privacy`, `coverImageUrl`).
  - Response: `{ message, community }`
- **`DELETE /api/communities/{communityId}`**
  - Description: Deletes a community. Requires authentication as community creator.
  - Query Params: `userId`
  - Response: `{ message }`
- **`GET /api/communities/{communityId}/members`**
  - Description: Retrieves members of a community.
  - Response: `User[]`
- **`POST /api/communities/{communityId}/members`**
  - Description: Allows a user to join a public community or request to join a private one.
  - Request Body: `{ userId }`
  - Response: `{ message }`
- **`DELETE /api/communities/{communityId}/members`**
  - Description: Allows a user to leave a community.
  - Query Params: `userId`
  - Response: `{ message }`
- **`GET /api/communities/{communityId}/requests`**
  - Description: Retrieves pending join requests for a private community (admin/creator only).
  - Query Params: `currentUserId` (for authorization).
  - Response: `User[]`
- **`POST /api/communities/{communityId}/requests`**
  - Description: Approves or denies a join request for a private community (admin/creator only).
  - Request Body: `{ userIdToManage, action ("approve" | "deny"), currentUserId }`
  - Response: `{ message }`
- **`POST /api/communities/{communityId}/transfer-ownership`**
  - Description: Transfers ownership of a community to another member (creator only).
  - Request Body: `{ currentUserId, newOwnerId }`
  - Response: `{ message }`

---
### **Notifications**
---
- **`GET /api/notifications`**
  - Description: Retrieves notifications for the authenticated user.
  - Query Params: `userId`
  - Response: `Notification[]`
- **`PATCH /api/notifications/{notificationId}`**
  - Description: Marks a notification as read or unread.
  - Request Body: `{ userId, isRead (boolean) }`
  - Response: `{ message }`
- **`DELETE /api/notifications/{notificationId}`**
  - Description: Deletes a specific notification for the user.
  - Query Params: `userId`
  - Response: `{ message }`
- **`POST /api/notifications`** (Special action endpoint)
  - Description: Marks all notifications as read for a user.
  - Request Body: `{ userId, action: "markAllRead" }`
  - Response: `{ message, modifiedCount }`
- **`DELETE /api/notifications`** (Special action endpoint)
  - Description: Deletes all notifications for a user.
  - Query Params: `userId`
  - Response: `{ message, deletedCount }`

---
### **Reports**
---
- **`POST /api/reports`**
  - Description: Submits a new content report.
  - Request Body: `{ itemId, itemType, reporterUserId, reasonCategory, reasonText? }`
  - Response: `{ message, reportId }`
- **`GET /api/reports`**
  - Description: Retrieves reports submitted by a user.
  - Query Params: `userId`
  - Response: `Report[]`
- **`PATCH /api/reports/{reportId}/status`**
  - Description: Updates the status of a report (admin/moderator action).
  - Request Body: `{ newStatus, reviewerId, reviewNotes? }`
  - Response: `{ message, report }`

---
### **File Uploads**
---
- **`POST /api/upload`**
  - Description: Uploads a file (image, video, document).
  - Request Body: `FormData` with a `file` field.
  - Response: `{ success, url, name }` or `{ success, message }` on error.

---
### **Search**
---
- **`GET /api/search`**
  - Description: Performs a search across posts and events.
  - Query Params: `q` (search query), `type?` ("all", "posts", "events"), `sortBy?` ("relevance", "newest", "oldest"), `forUserId?`.
  - Response: `{ posts: Post[], events: Event[] }`

---
*Document Version: 1.0*
*Last Updated: (Current Date)*
*Note: Zod schemas for request/response bodies are defined within each API route handler file and are not duplicated here for brevity.*
