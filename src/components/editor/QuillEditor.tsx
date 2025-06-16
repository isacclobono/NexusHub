
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
  const isQuillInitializedRef = useRef(false); // To prevent re-initialization
  const currentContentRef = useRef<string>(value); // Track current editor content

  // Initialize Quill
  useEffect(() => {
    if (editorRef.current && !isQuillInitializedRef.current) {
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
      isQuillInitializedRef.current = true; // Mark as initialized

      // Set initial content
      if (typeof value === 'string') {
        try {
          const delta = quill.clipboard.convert(value);
          quill.setContents(delta, 'silent');
          currentContentRef.current = value;
        } catch (e) {
          console.error("Quill: Initial content conversion error", e, "HTML:", value);
          quill.setText(value.replace(/<[^>]*>?/gm, ''), 'silent');
          currentContentRef.current = quill.root.innerHTML;
        }
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          const newHtml = quill.root.innerHTML;
          currentContentRef.current = newHtml;
          onChange(newHtml);
        }
      });
    }
  }, [readOnly, placeholder]); // Removed 'value' to ensure init runs only once based on structure props

  // Handle updates to 'value' prop from parent
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill && typeof value === 'string' && value !== currentContentRef.current) {
      try {
        // Store cursor position
        const range = quill.getSelection();
        
        const delta = quill.clipboard.convert(value);
        quill.setContents(delta, 'silent');
        currentContentRef.current = value; // Update internal tracker

        // Restore cursor position if it existed
        if (range) {
            // Check if the previous range is still valid.
            // If text length changed significantly, setting the old range might be problematic.
            // For simplicity, try to set it. More complex logic might be needed for perfect cursor restoration.
            quill.setSelection(range.index, range.length, 'silent');
        }

      } catch (e) {
        console.error("Quill: Prop update content conversion error", e, "HTML:", value);
        // Fallback to setting text if HTML conversion fails
        quill.setText(value.replace(/<[^>]*>?/gm, ''), 'silent');
        currentContentRef.current = quill.root.innerHTML; // Update internal tracker
      }
    }
  }, [value]); // Only react to 'value' prop changes here

  // Update readOnly state if it changes
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill && quill.options.readOnly !== readOnly) {
      quill.enable(!readOnly);
    }
  }, [readOnly]);

  // Cleanup Quill instance on component unmount
  useEffect(() => {
    return () => {
      // No direct cleanup of quillInstanceRef.current = null here as it can cause issues with HMR
      // The instance is tied to the component's lifecycle; if it unmounts, the ref is gone.
      // isQuillInitializedRef should ensure it's not re-init on fast-refresh if component itself isn't fully unmounted.
    };
  }, []);

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;

