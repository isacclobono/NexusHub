# NexusHub Release Notes

This document tracks new features, improvements, and bug fixes for each version of NexusHub.

## Version 0.6.0 (Planned - Internal Build)
*Date: (Current Date)*

### ✨ New Features
- **Documentation Suite:** Added initial versions of 15 key documentation files including SRS, System Design, API Docs, User Manual, Technical Architecture, Database Design, Deployment Guide, Testing Plan, Security Plan, Coding Standards, Release Notes, FAQ, UI/UX Style Guide, Project Roadmap, and Contribution Guidelines. These are located in the `/docs` directory and `CONTRIBUTING.md` in the project root.

### 🚀 Improvements
- (No direct code changes in this release, focus on documentation.)

### 🐛 Bug Fixes
- (No direct code changes in this release, focus on documentation.)

---

## Version 0.5.0
*Date: (Previous Build Date)*

### ✨ New Features
- **Polls in Posts:**
    - Users can create posts with a "poll" type, define a question (title), and add multiple choice options.
    - Authenticated users can vote once per poll.
    - Poll results (vote counts and percentages) are displayed after a user has voted or if the poll is closed (closing mechanism TBD).
    - `Post` data model updated with `postType`, `pollOptions`, `totalVotes`, `userVotedOptionId`.
    - API route `POST /api/posts/[postId]/vote` created to handle votes.
    - UI updated in `CreatePostForm`, `EditPostForm`, `PostCard`, and `PostPage` to support poll creation, display, and interaction.
- **Content Reporting - User Feedback Notifications:**
    - Users now receive notifications when the status of a report they submitted is updated by an admin/moderator.
    - New notification types: `report_reviewed_action_taken`, `report_reviewed_no_action`.
    - New API route `PATCH /api/reports/[reportId]/status` to simulate admin action on reports and trigger notifications.
    - `Report` type updated with optional `reviewNotes`.
    - "My Reports" page now displays `reviewNotes` and uses improved status badges.

### 🚀 Improvements
- **Community Settings UI:** Streamlined description for transferring ownership in `CommunitySettingsPage`.
- **API Stability (Event & Post Updates):**
    - Refined `PUT /api/events/[eventId]` to more accurately detect changes before updating, preventing "Event update failed" errors when no actual data was modified. Now includes detailed logging on update failure.
    - Refined `PUT /api/posts/[postId]` for more robust updates and better change detection, aiming to reduce "Post update failed" errors. Now includes detailed logging on update failure.
- **User ID Display:** User ID is now displayed on public profile pages.
- **Post Card & Post Page (Media Handling):** Improved logic for rendering different media types (image, video, document).
- **File Input Components:** Standardized file type constants and max file size for uploads.

### 🐛 Bug Fixes
- **Toast Notification Error:** Fixed `toast.info is not a function` error in `PostCard.tsx` by using `toast()` for informational messages.
- **Time Input Value/DefaultValue Conflict:** Resolved console errors in date/time pickers across event and post forms by ensuring time inputs are fully controlled components using `value` instead of `defaultValue`.
- **Quill Editor Content Display:** Improved stability of the Quill editor in `EditPostForm.tsx` to correctly display and update content, especially when the `value` prop changes.
- **Missing Imports:** Added `ObjectId` import to `src/components/feed/PostCard.tsx`.

---

*(Previous versions like 0.4.0, 0.3.0, etc., would be listed here with their respective changes.)*
