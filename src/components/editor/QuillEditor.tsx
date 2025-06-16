
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
  const isQuillInitializedRef = useRef(false);
  // currentHtmlRef will store the HTML content that the Quill editor is currently displaying
  // or the last HTML value passed as a prop that was successfully set.
  const currentHtmlRef = useRef<string>(value);

  // Initialize Quill instance
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
      isQuillInitializedRef.current = true;

      // Set initial content
      // Ensure value is treated as a string, even if it's null/undefined from parent initially
      const initialContent = typeof value === 'string' ? value : '';
      if (initialContent !== quill.root.innerHTML) { // Avoid redundant update
        try {
          quill.root.innerHTML = initialContent;
          currentHtmlRef.current = initialContent;
        } catch (e) {
            console.error("Quill: Error setting initial HTML content", e, "HTML:", initialContent);
            // Fallback to setting as plain text if HTML setting fails
            quill.setText(initialContent.replace(/<[^>]*>?/gm, ''));
            currentHtmlRef.current = quill.root.innerHTML;
        }
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          const newHtml = quill.root.innerHTML;
          currentHtmlRef.current = newHtml; // Update ref on user change
          onChange(newHtml);
        }
      });
    }
  }, [readOnly, placeholder]); // Dependencies for initialization. 'value' is handled by its own effect.

  // Handle external value changes (from props)
  useEffect(() => {
    const quill = quillInstanceRef.current;
    // Check if Quill is initialized and if the incoming 'value' prop is different from what we last set/know
    if (quill && typeof value === 'string' && value !== currentHtmlRef.current) {
      try {
        const selection = quill.getSelection(); // Preserve selection
        quill.root.innerHTML = value; // Set HTML content
        currentHtmlRef.current = value; // Sync ref after programmatic change

        if (selection) { // Try to restore selection
            // Check if the previous range is still valid within the new content length
            if (selection.index + selection.length <= quill.getLength()) {
                 quill.setSelection(selection.index, selection.length, 'silent');
            } else {
                // If old selection is out of bounds, move cursor to the end
                quill.setSelection(quill.getLength(), 0, 'silent');
            }
        }
      } catch (e) {
        console.error("Quill: Prop update content setting error", e, "HTML:", value);
        // Fallback if setting HTML fails
        const selection = quill.getSelection();
        quill.setText(String(value).replace(/<[^>]*>?/gm, ''), 'silent');
        currentHtmlRef.current = quill.root.innerHTML;
         if (selection) {
            if (selection.index + selection.length <= quill.getLength()) {
                 quill.setSelection(selection.index, selection.length, 'silent');
            } else {
                quill.setSelection(quill.getLength(), 0, 'silent');
            }
        }
      }
    }
  }, [value]); // This effect runs ONLY when 'value' prop changes

  // Handle readOnly prop changes separately
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill) {
      quill.enable(!readOnly);
    }
  }, [readOnly]);

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;
    