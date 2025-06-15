
// This file is intentionally blank.
// It's used to declare modules for which type definitions are not readily available
// or for local development overrides.

// For example, if you were using a library without official types:
// declare module 'some-untyped-library';

// Or to augment existing types (though this is better done in a .d.ts file with a more specific name)
// declare module 'some-library' {
//   export interface SomeInterface {
//     newProperty?: string;
//   }
// }

// Add type declaration for Quill if not using @types/quill or if specific overrides are needed.
// If @types/quill is installed, this might not be strictly necessary but can help with module resolution in some setups.
declare module 'quill/core';
declare module 'quill/formats/link';
// Add other Quill modules or formats as needed if you import them directly.
