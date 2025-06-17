# NexusHub Coding Standards and Guidelines

## 1. Introduction
These coding standards and guidelines are established to ensure consistency, readability, maintainability, and quality across the NexusHub codebase. All developers contributing to the project are expected to adhere to these standards.

## 2. General Principles
- **Readability:** Code should be easy to read and understand. Use clear variable and function names.
- **Consistency:** Follow established patterns and styles throughout the project.
- **Simplicity (KISS):** "Keep It Simple, Stupid." Avoid unnecessary complexity.
- **DRY (Don't Repeat Yourself):** Abstract reusable logic into functions or components.
- **SOLID Principles:** While not strictly enforced for all frontend components, strive to apply SOLID principles where applicable, especially in backend logic and core services.
- **Performance:** Be mindful of performance implications, especially in critical paths or frequently rendered components.
- **Security:** Write secure code by default. Sanitize inputs, validate data, and follow security best practices (see `Security_Plan.md`).

## 3. Language: TypeScript
- **Strict Mode:** The `tsconfig.json` should have `strict: true` enabled. Address all TypeScript errors.
- **Type Safety:**
    - Provide explicit types for function parameters, return values, and variables where type inference is not clear or sufficient.
    - Avoid using `any` whenever possible. Use `unknown` for values where the type is truly unknown and perform type checking.
    - Use `import type { ... } from '...'` for importing only types/interfaces.
- **Interfaces vs. Types:**
    - Prefer `interface` for defining the shape of objects, especially if they might be extended or implemented by classes.
    - Use `type` for union types, intersection types, tuples, or simple aliases for primitives or complex types.
- **Enums:** Use string enums (e.g., `enum Status { Published = "published", Draft = "draft" }`) or string literal union types (e.g., `type Status = "published" | "draft";`) for sets of named constants. Avoid numeric enums due to potential reverse mapping issues.
- **Null and Undefined:** Be explicit about handling `null` and `undefined`. Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate.

## 4. React & Next.js (App Router)
- **Functional Components & Hooks:** Exclusively use functional components with React Hooks.
- **Component Naming:** Use `PascalCase` for component filenames and component names (e.g., `PostCard.tsx`, `function PostCard(...)`).
- **Component Structure:**
    - Keep components small and focused on a single responsibility (Single Responsibility Principle).
    - Separate presentational components (UI focused) from container components (logic, data fetching) when complexity warrants.
- **Props:**
    - Use descriptive prop names.
    - Define prop types using TypeScript interfaces, co-located with the component or in a shared types file if widely used.
    - Provide default props for optional props where sensible using default parameter values.
- **State Management:**
    - `useState`: For simple, local component state.
    - `useReducer`: For more complex state logic within a component or closely related components.
    - React Context API (e.g., `AuthProvider`): For global state or state shared across a large part of the component tree. Avoid overusing Context for performance reasons.
- **Server Components:**
    - Default to Server Components for data fetching and rendering static or server-generated content.
    - Use `async/await` directly in Server Components for data fetching.
- **Client Components:**
    - Use the `'use client'` directive only when necessary (for components that use hooks like `useState`, `useEffect`, event handlers, or browser-specific APIs).
    - Keep Client Components as small as possible and push state/interactivity down the tree.
- **Server Actions:**
    - Use Server Actions for form submissions and data mutations that originate from either Server or Client Components. This simplifies data handling and reduces the need for manual API endpoint creation for simple mutations.
    - Define Server Actions in Server Components or separate files with the `'use server'` directive.
- **Routing:**
    - Use the file-system based routing provided by the Next.js App Router.
    - Use dynamic segments for route parameters (e.g., `app/posts/[postId]/page.tsx`).
    - Use simple routing for authenticated navigation; avoid route groups unless a specific shared layout requirement necessitates them for those routes.
- **Error Handling:**
    - Implement `error.tsx` files at appropriate levels of the App Router directory structure to handle runtime errors and provide user-friendly error boundaries.
    - Handle API errors gracefully in data fetching functions and UI.
- **Images:**
    - Use the `next/image` component for optimized images.
    - Provide `width`, `height`, and `alt` props.
    - Use `https://placehold.co` for placeholder images during development, with `data-ai-hint` attributes.

## 5. Styling (Tailwind CSS & ShadCN UI)
- **Tailwind CSS:**
    - Embrace the utility-first approach. Compose styles directly in JSX.
    - Use `@apply` in CSS files sparingly, primarily for custom base styles or complex component abstractions that cannot be easily achieved with utilities.
    - Group related utilities for readability (e.g., spacing, typography, borders).
    - Configure theme customizations (colors, fonts, spacing) in `tailwind.config.ts`.
- **ShadCN UI:**
    - Utilize ShadCN components as the primary UI building blocks.
    - Customize components by modifying their source files in `src/components/ui/` or by overriding styles through Tailwind utilities or CSS variables.
    - Follow the HSL CSS variable system defined in `src/app/globals.css` for theming.
- **CSS Variables:** Use the CSS variables defined in `globals.css` for colors to ensure theme consistency (e.g., `bg-primary`, `text-foreground`).

## 6. API Routes & Server Actions
- **File Structure:** API routes under `src/app/api/`. Server Actions can be co-located or in separate `actions.ts` files.
- **Request/Response:** Use standard HTTP methods and status codes. Return JSON responses.
- **Validation:** Use Zod for validating request bodies, query parameters, and route parameters.
- **Error Handling:** Return meaningful error messages and appropriate HTTP status codes.
- **Security:** Implement authentication and authorization checks for protected routes/actions.
- **Async/Await:** Use `async/await` for all asynchronous operations.

## 7. Genkit (AI Flows)
- **File Naming & Location:** Each Genkit flow should reside in its own file within `src/ai/flows/` (e.g., `smart-content-categorization.ts`).
- **Directives:** Include `'use server';` at the top of each flow file.
- **Schema Definitions:** Use Zod (`z`) to define clear input and output schemas for flows and prompts.
- **Documentation:** Add JSDoc comments at the top of each file explaining the flow's purpose, its exported interface, and any important considerations.
- **Core Genkit Functions:** Consistently use `ai.defineFlow(...)`, `ai.definePrompt(...)`, and `ai.defineTool(...)`.
- **Handlebars Templating:** Use Handlebars syntax for prompt templates. Avoid logic within templates.
- **Error Handling:** Implement robust error handling within flows.

## 8. Formatting & Linting
- **Formatter:** Prettier (configuration should be in the project, e.g., `.prettierrc`).
- **Linter:** ESLint (configuration should be in the project, e.g., `.eslintrc.json`).
- **Pre-commit Hooks (Recommended):** Use Husky and lint-staged to automatically format and lint code before committing.
- **IDE Integration:** Configure your IDE to use the project's Prettier and ESLint configurations.

## 9. Naming Conventions
- **Variables, Functions, Hook Names:** `camelCase` (e.g., `fetchUserData`, `useAuth`).
- **Components, Classes, Interfaces, Types, Enums:** `PascalCase` (e.g., `PostCard`, `interface UserProfile`).
- **Constants (if truly constant and global):** `UPPER_SNAKE_CASE` (e.g., `MAX_POST_LENGTH`).
- **Files:**
    - React Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`).
    - Non-component TS/JS files (hooks, utils, services): `kebab-case.ts` (e.g., `use-auth-provider.ts`, `api-helpers.ts`).
    - API Route handlers: `route.ts`.
    - Page files (App Router): `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`.

## 10. Comments
- **Purposeful Comments:** Write comments to explain *why* something is done, not *what* is being done (if the code itself is clear). Explain complex logic, workarounds, or important assumptions.
- **JSDoc:** Use JSDoc for functions, components, and types, especially for public APIs or complex logic, to describe parameters, return values, and purpose.
- **TODO/FIXME:** Use `// TODO:` for planned work and `// FIXME:` for known issues that need addressing. Include a brief explanation.
- **Avoid Obvious Comments:** Do not comment code that is self-explanatory.
- **No Comments in `package.json` or `globals.css` (Theme Variables):** These files are typically parsed by tools and comments can cause issues. Build-step comments for Tailwind in `globals.css` are an exception.

## 11. Version Control (Git)
- **Commit Messages:** Write clear, concise, and descriptive commit messages following conventional commit formats if adopted (e.g., `feat: Add user profile page`, `fix: Correct login validation`).
- **Branching Strategy:** Use feature branches (e.g., `feature/add-polls`, `fix/login-bug`).
- **Pull Requests (PRs):**
    - Ensure PRs are focused on a single feature or bug fix.
    - Write a clear description of the changes in the PR.
    - Link to relevant issues.
    - Ensure all tests pass and code is linted/formatted before requesting a review.
- **Keep History Clean:** Rebase feature branches onto the main branch before merging (if preferred by the team) to maintain a linear history.

## 12. File and Directory Structure
- Follow the Next.js App Router conventions.
- Group related components, hooks, types, and utilities into feature-based or domain-based directories within `src/` where appropriate (e.g., `src/components/feed/`, `src/hooks/`, `src/lib/`).

---
*Document Version: 1.0*
*Last Updated: (Current Date)*
