
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
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
  const isQuillInitialized = useRef(false);

  const debouncedOnChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange]
  );

  useEffect(() => {
    if (editorRef.current && !isQuillInitialized.current && typeof window !== 'undefined') {
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'], // Image and video removed for simplicity, can be added back
            ['clean']
          ],
        },
        placeholder: placeholder || 'Start writing...',
        readOnly: readOnly,
      });

      quillInstanceRef.current = quill;
      isQuillInitialized.current = true;

      if (value) {
        // Safely convert HTML string to Delta for setting initial content
        try {
            const delta = quill.clipboard.convert(value);
            quill.setContents(delta, 'silent');
        } catch (e) {
            console.error("Error converting HTML to Delta for Quill:", e, "HTML:", value);
            // Fallback: set as plain text or clear if conversion fails
            quill.setText(value.replace(/<[^>]*>?/gm, '') || '');
        }
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          debouncedOnChange(quill.root.innerHTML);
        }
      });
    }

    return () => {
      // No explicit cleanup needed here, Quill handles its own destruction typically
      // If issues arise, one might consider `quillInstanceRef.current?.destroy()` or similar.
    };
  }, [readOnly, placeholder, debouncedOnChange]); // Removed value from deps to prevent re-init on value change

  // Handle external value changes after initialization
  useEffect(() => {
    if (quillInstanceRef.current && value !== quillInstanceRef.current.root.innerHTML) {
      const currentSelection = quillInstanceRef.current.getSelection();
      try {
        const delta = quillInstanceRef.current.clipboard.convert(value);
        quillInstanceRef.current.setContents(delta, 'silent');
      } catch (e) {
         console.error("Error converting HTML to Delta on update:", e, "HTML:", value);
         quillInstanceRef.current.setText(value.replace(/<[^>]*>?/gm, '') || '');
      }
      if (currentSelection) {
        setTimeout(() => {
          if (quillInstanceRef.current) { // Check if still mounted
            quillInstanceRef.current.setSelection(currentSelection);
          }
        }, 0);
      }
    }
  }, [value]);


  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;
