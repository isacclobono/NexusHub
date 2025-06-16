'use client';

import React, { useEffect, useRef } from 'react';
import Quill from 'quill';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, readOnly = false, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  // To prevent feedback loop: setContents -> text-change -> onChange -> prop update -> setContents
  const isUpdatingInternally = useRef(false);

  useEffect(() => {
    if (editorRef.current) {
      if (!quillInstanceRef.current) { // Initialize Quill only once
        const quill = new Quill(editorRef.current, {
          theme: 'snow',
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link'],
              ['clean']
            ],
          },
          placeholder: placeholder || 'Start writing...',
          readOnly: readOnly,
        });
        quillInstanceRef.current = quill;

        // Listener for text changes by the user
        quill.on('text-change', (delta, oldDelta, source) => {
          if (source === 'user') {
            if (isUpdatingInternally.current) return;
            onChange(quill.root.innerHTML);
          }
        });
      }

      const quill = quillInstanceRef.current;

      // Handle external value changes (from props)
      // Ensure value is a string and different from current editor content
      // And also make sure we are not in the middle of an internal update (which might be caused by an earlier onChange call)
      if (typeof value === 'string' && value !== quill.root.innerHTML && !isUpdatingInternally.current) {
        isUpdatingInternally.current = true; // Signal that the upcoming change is programmatic
        try {
          const delta = quill.clipboard.convert(value); // Convert HTML string to Delta
          quill.setContents(delta, 'silent'); // Set content without triggering 'text-change' from 'api' source
        } catch (e) {
          console.error("Quill: Error converting HTML for content update", e, "HTML:", value);
          // Fallback: try to set as plain text, stripping HTML tags
          const plainText = value.replace(/<[^>]*>?/gm, '');
          quill.setText(plainText, 'silent');
        }
        // Schedule the flag reset to allow Quill to process setContents and prevent immediate re-triggering.
        // A microtask (Promise.resolve) or setTimeout(0) can work.
        Promise.resolve().then(() => {
            isUpdatingInternally.current = false;
        });
      }

      // Update readOnly state if it changes
      if (quill.options.readOnly !== readOnly) {
        quill.enable(!readOnly);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, readOnly, placeholder]); // onChange is stable, editorRef and quillInstanceRef are refs

  // Cleanup Quill instance on component unmount
  useEffect(() => {
    return () => {
      if (quillInstanceRef.current) {
        // Basic cleanup, specific listeners should be unmounted if added manually
        quillInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;