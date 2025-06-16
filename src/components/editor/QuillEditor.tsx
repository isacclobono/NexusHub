
'use client';

import React, { useEffect, useRef } from 'react';
import Quill from 'quill';

interface QuillEditorProps {
  value: string | null | undefined; // Allow null/undefined initial value
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, readOnly = false, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  const contentJustSetProgrammaticallyRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !quillInstanceRef.current) {
      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ],
        },
        placeholder: placeholder || 'Start writing...',
        readOnly: readOnly,
      });
      quillInstanceRef.current = quill;

      // Set initial content if value is provided
      if (typeof value === 'string') {
        contentJustSetProgrammaticallyRef.current = true;
        try {
            const delta = quill.clipboard.convert(value);
            quill.setContents(delta, 'silent');
        } catch (e) {
            console.error("Quill: Error setting initial HTML content", e);
            quill.setText(String(value).replace(/<[^>]*>?/gm, ''), 'silent'); // Fallback
        }
        contentJustSetProgrammaticallyRef.current = false;
      } else {
        // Ensure editor is empty if no initial value
        quill.setText('', 'silent');
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user' && !contentJustSetProgrammaticallyRef.current) {
          onChange(quill.root.innerHTML);
        }
      });
    }
  }, []); // Initialize Quill only once

  // Handle updates to the 'value' prop from parent
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill) {
      if (typeof value === 'string') {
        if (value !== quill.root.innerHTML) {
          contentJustSetProgrammaticallyRef.current = true;
          const selection = quill.getSelection();
          try {
            const delta = quill.clipboard.convert(value);
            quill.setContents(delta, 'silent');
          } catch (e) {
            console.error("Quill: Error updating HTML content", e);
            quill.setText(String(value).replace(/<[^>]*>?/gm, ''), 'silent'); // Fallback
          }
          if (selection && quill.hasFocus()) {
            try { quill.setSelection(selection.index, selection.length, 'silent'); }
            catch (e) { quill.setSelection(quill.getLength(), 0, 'silent');}
          }
          contentJustSetProgrammaticallyRef.current = false;
        }
      } else if (value === null || value === undefined) {
        // If prop value becomes null/undefined, clear the editor
        if (quill.root.innerHTML !== '<p><br></p>' && quill.root.innerHTML !== '') {
            contentJustSetProgrammaticallyRef.current = true;
            quill.setText('', 'silent');
            contentJustSetProgrammaticallyRef.current = false;
        }
      }
    }
  }, [value]); // React to changes in the 'value' prop

  // Handle readOnly prop changes
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (quill) {
      quill.enable(!readOnly);
    }
  }, [readOnly]);

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;
    