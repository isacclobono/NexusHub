
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
  const isQuillInitialized = useRef(false); // To track if Quill instance is created
  const currentContentRef = useRef<string>(value); // To track content passed via props

  const debouncedOnChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange]
  );

  // Effect for initializing Quill
  useEffect(() => {
    if (editorRef.current && !isQuillInitialized.current && typeof window !== 'undefined') {
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
      isQuillInitialized.current = true; // Mark as initialized

      // Set initial content if `value` (from props) is available
      // Ensure `value` is treated as a string.
      const initialHtmlToSet = typeof value === 'string' ? value : '';
      try {
        const delta = quill.clipboard.convert(initialHtmlToSet);
        quill.setContents(delta, 'silent');
        currentContentRef.current = initialHtmlToSet; // Sync ref
      } catch (e) {
        console.error("Error converting HTML to Delta for Quill (initialization):", e, "HTML:", initialHtmlToSet);
        quill.setText(initialHtmlToSet.replace(/<[^>]*>?/gm, '') || ''); // Fallback
        currentContentRef.current = quill.root.innerHTML; // Sync ref with fallback
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          const newHtml = quill.root.innerHTML;
          currentContentRef.current = newHtml; // Update ref on user change
          debouncedOnChange(newHtml);
        }
      });
    }
  }, [readOnly, placeholder, debouncedOnChange, value]); // Added value to initial effect dependencies for initial setup only.

  // Effect for handling updates to the `value` prop from outside (e.g., form reset)
  useEffect(() => {
    const quill = quillInstanceRef.current;
    // Ensure Quill is initialized and the external value has actually changed from what Quill knows
    if (quill && typeof value === 'string' && value !== currentContentRef.current) {
      const selection = quill.getSelection();
      try {
        const delta = quill.clipboard.convert(value);
        quill.setContents(delta, 'silent');
        currentContentRef.current = value; // Update ref after setting content
      } catch (e) {
        console.error("Error converting HTML to Delta on update:", e, "HTML:", value);
        quill.setText(value.replace(/<[^>]*>?/gm, '') || ''); // Fallback
        currentContentRef.current = quill.root.innerHTML; // Sync ref with fallback
      }
      
      if (selection && quill.hasFocus()) {
        // Try to restore selection if editor had focus
        // Use timeout to allow Quill to process setContents fully
        setTimeout(() => {
          if (quillInstanceRef.current && quillInstanceRef.current.hasFocus()) {
            quillInstanceRef.current.setSelection(selection.index, selection.length, 'silent');
          }
        }, 0);
      }
    }
  }, [value]); // This effect specifically listens to changes in the `value` prop

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;
