# NexusHub UI/UX Style Guide

## 1. Introduction
This document outlines the User Interface (UI) and User Experience (UX) design standards for the NexusHub platform. Its purpose is to ensure a consistent, intuitive, accessible, and aesthetically pleasing experience for all users.

## 2. Core Design Principles
- **Clarity:** Information should be easy to understand and actions clear.
- **Consistency:** UI elements and interaction patterns should be consistent across the platform.
- **Efficiency:** Users should be able to achieve their goals with minimal effort.
- **Accessibility:** Design for inclusivity, ensuring usability for people with diverse abilities (aiming for WCAG AA).
- **Feedback:** Provide clear feedback to users for their actions (e.g., loading states, success/error messages).
- **Simplicity:** Avoid unnecessary clutter and complexity.

## 3. Color Palette
The color palette is defined using HSL CSS variables in `src/app/globals.css` to support theming (light/dark mode).
- **Primary (`--primary`):** e.g., `221 83% 53%` (Vibrant Blue). Used for primary actions, links, active states, and branding accents.
    - Foreground: `hsl(var(--primary-foreground))` (Typically white or very light for contrast on primary).
- **Secondary (`--secondary`):** e.g., `215 20% 93%` (Light Gray). Used for secondary button backgrounds, subtle backgrounds, or alternative card styles.
    - Foreground: `hsl(var(--secondary-foreground))` (Darker text).
- **Accent (`--accent`):** e.g., `258 90% 66%` (Vibrant Purple). Used for special call-to-actions, highlights, or to differentiate certain UI elements.
    - Foreground: `hsl(var(--accent-foreground))` (Typically white or very light).
- **Background (`--background`):** e.g., `210 40% 98%` (Off-White/Very Light Gray). Main page background.
- **Foreground (`--foreground`):** e.g., `215 28% 17%` (Dark Gray/Near Black). Default text color.
- **Card (`--card`):** e.g., `0 0% 100%` (White). Background for card components.
    - Foreground: `hsl(var(--card-foreground))` (Matches main foreground).
- **Popover (`--popover`):** Similar to Card, for popups and dropdowns.
- **Destructive (`--destructive`):** e.g., `0 84% 60%` (Red). For error messages, delete actions, critical warnings.
    - Foreground: `hsl(var(--destructive-foreground))` (Light text).
- **Muted (`--muted`):** e.g., `215 20% 93%`. For subtle backgrounds or dividers.
    - Foreground (`--muted-foreground`): e.g., `215 14% 47%` (Medium Gray). For less prominent text, descriptions, placeholders.
- **Border (`--border`):** e.g., `214 20% 91%`. Default border color.
- **Input (`--input`):** Border color for input fields.
- **Ring (`--ring`):** Color for focus rings (usually matches primary).

**Dark Mode:** Equivalent HSL variables are defined in `globals.css` within the `.dark {}` selector, providing darker backgrounds and lighter text/accent colors.

## 4. Typography
- **Headline Font:** `Inter` (Variable: `--font-inter`). Used for page titles, card titles, and major headings. Weights: Bold (700), Semi-Bold (600).
- **Body Font:** `Inter` (Variable: `--font-inter`). Used for general text content, descriptions, labels. Weights: Regular (400), Medium (500).
- **Code Font:** `JetBrains Mono` (Variable: `--font-jetbrains-mono`). Used for any code snippets or technical IDs.
- **Hierarchy:** Use a clear typographic scale (e.g., `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl` from Tailwind) to establish visual hierarchy.
- **Line Height & Spacing:** Ensure comfortable line heights (`leading-normal`, `leading-relaxed`) and appropriate letter spacing for readability.

## 5. Iconography
- **Library:** Lucide React (`lucide-react`).
- **Style:** Consistent stroke width (typically 1.5px or 2px), clean, modern, and easily recognizable.
- **Size:** Common sizes are 16px (`h-4 w-4`), 20px (`h-5 w-5`), 24px (`h-6 w-6`). Adjust as needed for context.
- **Usage:**
    - Use icons to support text labels, not replace them entirely unless the icon is universally understood (e.g., close 'X').
    - Ensure icons are meaningful and enhance usability.
    - Provide appropriate `aria-label` or `title` attributes for accessibility if the icon is interactive or conveys important information without visible text.

## 6. Components (Based on ShadCN UI)
- **Buttons:**
    - Variants: `default` (primary action), `destructive`, `outline`, `secondary`, `ghost`, `link`.
    - Sizes: `default`, `sm`, `lg`, `icon`.
    - Use the `btn-gradient` class for prominent call-to-action buttons.
    - Ensure clear focus and hover states.
- **Cards:** Primary container for content blocks (posts, profiles, events). Consistent padding and border radius (`rounded-lg`).
- **Forms:**
    - Use `Label`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch` from `components/ui`.
    - Clear, concise labels positioned above their respective inputs.
    - Provide helpful descriptions (`FormDescription`) and clear error messages (`FormMessage`).
- **Dialogs & Modals:**
    - `AlertDialog`: For critical confirmations (e.g., delete actions).
    - `Dialog`: For displaying more complex information or forms in an overlay.
- **Navigation:**
    - `Sidebar`: Primary navigation for main app sections. Collapsible on desktop, off-canvas on mobile.
    - `Header`: Global search, notifications, theme toggle, user profile dropdown.
    - `Tabs`: For organizing content within a page (e.g., user profile sections).
    - `Breadcrumbs` (Future): For deeply nested pages.
- **Avatars:** Consistent display for user images. Fallback to initials.
- **Badges:** Small, colored labels for status, tags, categories, or counts.
- **Tooltips:** For providing additional information on hover for icons or truncated text.
- **Skeletons:** Used as loading placeholders to improve perceived performance and reduce layout shift.
- **Rich Text Editor (Quill):** Standardized toolbar for content creation. Ensure output is sanitized.

## 7. Layout and Spacing
- **Grid System:** Utilize Tailwind CSS flexbox and grid utilities for responsive layouts.
- **Consistency:** Adhere to Tailwind's default spacing scale (e.g., `p-4`, `m-2`, `gap-4`). Base unit is typically 4px.
- **Responsiveness:** Design for mobile-first and ensure graceful adaptation to tablet and desktop screen sizes. Test layouts on various devices.
- **Container:** Use a main container with `mx-auto` and appropriate `max-w-` classes for content centering and readability.
- **Whitespace:** Use whitespace effectively to improve readability and visual separation of elements.

## 8. Imagery and Media
- **Placeholder Images:** Use `https://placehold.co/<width>x<height>.png?text=YourText`. Add `data-ai-hint` attributes for semantic meaning.
- **User Uploaded Media:**
    - Images: Optimize for web (e.g., WebP format where supported). Display with `next/image`.
    - Videos: Use HTML5 `<video>` tag with controls. Consider aspect ratios for consistent display.
    - Documents: Display as links with appropriate icons and filenames.
- **Cover Images:** Maintain consistent aspect ratios for community, event, and profile banners where applicable.

## 9. Accessibility (A11Y) - Target WCAG 2.1 Level AA
- **Semantic HTML:** Use HTML5 elements according to their semantic meaning (`<nav>`, `<main>`, `<article>`, `<aside>`, etc.).
- **Keyboard Navigation:** All interactive elements must be focusable and operable via keyboard. Ensure logical focus order.
- **ARIA Attributes:** Use ARIA (Accessible Rich Internet Applications) attributes where necessary to enhance semantics for assistive technologies (e.g., `aria-label`, `aria-describedby`, roles). ShadCN components often handle this well.
- **Color Contrast:** Ensure text and interactive elements have sufficient color contrast against their backgrounds. Use tools to check contrast ratios.
- **Focus States:** Provide clear and visible focus indicators for all interactive elements (Tailwind `focus-visible:ring-ring` utilities are helpful).
- **Alternative Text:** Provide descriptive `alt` text for all meaningful images.
- **Forms:** Ensure all form inputs have associated labels.

## 10. Tone of Voice & Microcopy
- **Tone:** Friendly, helpful, clear, concise, and professional.
- **Microcopy:** UI text (button labels, tooltips, error messages, descriptions) should be:
    - **Clear:** Easy to understand.
    - **Concise:** To the point.
    - **Consistent:** Use the same terminology for the same actions/concepts.
    - **Action-Oriented:** For buttons, use verbs that describe the action (e.g., "Create Post," "Save Changes").
- **Error Messages:** Should be polite, explain what went wrong, and suggest a solution if possible.

## 11. Motion & Animation
- Use animations and transitions subtly to enhance user experience, not distract.
- Animations should be smooth and performant.
- Follow Tailwind CSS and ShadCN conventions for animations (e.g., `animate-in`, `fade-in-0`).

---
*Document Version: 1.0*
*Last Updated: (Current Date)*
