# NexusHub Deployment Guide

## 1. Introduction
This guide provides instructions for building and deploying the NexusHub application. It covers environment setup, build processes, and deployment to common platforms.

## 2. Prerequisites
- **Node.js:** Version 18.x or later (check Next.js version requirements).
- **npm or yarn:** Package manager.
- **Git:** Version control system.
- **Firebase CLI (Optional):** If deploying to Firebase App Hosting (`npm install -g firebase-tools`).
- **MongoDB Atlas Account:** A free or paid cluster set up.
- **Google Cloud Project:** With Billing enabled, and Google Genkit & Gemini APIs enabled for AI features.

## 3. Configuration
### 3.1 Environment Variables
Create a `.env.local` file in the project root for local development. **Do NOT commit this file to version control.**
```env
# MongoDB Connection
MONGODB_URI="your_mongodb_atlas_connection_string_with_credentials"
MONGODB_DB_NAME="your_nexushub_database_name"

# Genkit / Google AI
# Ensure you have authenticated gcloud CLI or set application default credentials,
# OR provide the API key directly if supported by your Genkit configuration.
GEMINI_API_KEY="your_google_ai_gemini_api_key"
# If using Application Default Credentials, GOOGLE_APPLICATION_CREDENTIALS might be needed
# pointing to your service account key JSON file for local development.

# Next.js Public Base URL (Used for absolute URLs like password reset links)
# For development, this matches your local dev server.
NEXT_PUBLIC_BASE_URL="http://localhost:9002"

# Add any other necessary secrets or configuration keys here
# E.g., for a future robust auth system:
# NEXTAUTH_URL="http://localhost:9002"
# NEXTAUTH_SECRET="a_very_strong_random_secret_string"
```
For production, these variables **must** be configured in your hosting provider's environment variable settings.

### 3.2 `apphosting.yaml` (Example for Firebase App Hosting)
If using Firebase App Hosting, your `apphosting.yaml` might look like this:
```yaml
# Settings to manage and configure a Firebase App Hosting backend.
# https://firebase.google.com/docs/app-hosting/configure

runConfig:
  # Automatically spin up more instances in response to increased traffic.
  minInstances: 0 # Can be 0 for cost saving, or 1+ for faster cold starts
  maxInstances: 2 # Adjust based on expected traffic

# environmentVariables:
#   NODE_ENV: production # Set by Firebase automatically
#   # MONGODB_URI: set_in_firebase_secret_manager
#   # MONGODB_DB_NAME: your_db_name_here
#   # GEMINI_API_KEY: set_in_firebase_secret_manager
#   # NEXT_PUBLIC_BASE_URL: your_production_url

# Required for Next.js
headers:
  - Next-js # Add a name that helps you identify your backend

# Firebase Secret Manager integration is recommended for sensitive variables.
# secrets:
#   - MONGODB_URI
#   - GEMINI_API_KEY
```

## 4. Build Process
To create a production-ready build of the Next.js application:
```bash
npm run build
# or
# yarn build
```
This command will compile the TypeScript code, optimize static assets, and prepare the application for deployment.

## 5. Deployment Options

### 5.1 Firebase App Hosting (Recommended for this stack)
1.  **Install Firebase CLI:** `npm install -g firebase-tools` (if not already installed).
2.  **Login:** `firebase login`.
3.  **Initialize Firebase in your project (if not done):** `firebase init apphosting` (select your Firebase project).
4.  **Configure Secrets (Recommended):**
    Store sensitive environment variables like `MONGODB_URI` and `GEMINI_API_KEY` in Firebase Secret Manager.
    ```bash
    firebase apphosting:secrets:set MONGODB_URI
    # (Paste your URI when prompted)
    firebase apphosting:secrets:set GEMINI_API_KEY
    # (Paste your key when prompted)
    ```
    Update your `apphosting.yaml` to reference these secrets.
5.  **Deploy:**
    ```bash
    firebase deploy --only apphosting
    ```

### 5.2 Vercel (Platform by the creators of Next.js)
1.  **Sign up/Login to Vercel.**
2.  **Import Project:** Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel.
3.  **Configure Project:**
    - Framework Preset: Should be automatically detected as Next.js.
    - Build Command: `npm run build` (or `yarn build`).
    - Output Directory: `.next` (usually default).
    - Environment Variables: Add `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, `NEXT_PUBLIC_BASE_URL` (with production URL) in the Vercel project settings.
4.  **Deploy:** Vercel typically deploys automatically on pushes to the main branch or when a PR is merged. Manual deployments are also possible.

### 5.3 Other Platforms (Netlify, AWS Amplify, DigitalOcean App Platform, etc.)
- Most modern PaaS providers support Next.js.
- **General Steps:**
    1.  Connect your Git repository.
    2.  Configure build settings (e.g., build command `npm run build`, publish directory `.next`).
    3.  Set environment variables for `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, and `NEXT_PUBLIC_BASE_URL`.
    4.  Follow the specific platform's deployment instructions.
- **File Uploads:** Ensure the platform handles or allows configuration for persistent file storage if you are not using a separate cloud storage service for uploads. The current local file upload will not work reliably on most serverless platforms.

## 6. Post-Deployment Checklist
- **Set Production Environment Variables:** Double-check all necessary environment variables are set correctly in your hosting environment.
- **Domain Configuration:** If using a custom domain, configure DNS records to point to your deployed application.
- **HTTPS:** Ensure HTTPS is enforced (most modern platforms do this by default).
- **Database IP Whitelisting:** If your MongoDB Atlas cluster has IP access list restrictions, ensure the IP addresses or ranges of your deployment platform are whitelisted. Serverless platforms often have a wide range of egress IPs, so "Allow Access from Anywhere" (0.0.0.0/0) might be needed during initial setup, but refine this for better security if possible.
- **Test Key Features:** Thoroughly test all core functionalities in the production environment (registration, login, post creation, event creation, etc.).
- **Monitoring & Logging:** Set up or review the monitoring and logging tools provided by your hosting platform to track application health, errors, and performance.

## 7. Genkit Deployment Considerations
- Genkit flows are part of the Next.js application when using `@genkit-ai/next`. Ensure the `GEMINI_API_KEY` (or necessary Google Cloud authentication) is available in the server environment where the API routes run.
- No separate deployment process for Genkit is typically needed in this integrated setup.

---
*Document Version: 1.0*
*Last Updated: (Current Date)*
