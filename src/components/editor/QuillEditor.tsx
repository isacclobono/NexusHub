
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
  const lastValuePropRef = useRef<string | null>(null); // Track the last `value` prop or user-set content

  useEffect(() => {
    if (editorRef.current && !quillInstanceRef.current) {
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
      lastValuePropRef.current = value; // Initialize with the first value

      // Set initial content
      if (typeof value === 'string') {
        // Check if quill's content is different from the initial value or if value is not just empty <p><br></p>
        const initialQuillContent = quill.root.innerHTML;
        const isValueMeaningful = value.replace(/<p><br><\/p>/gi, '').trim() !== '';
        
        if (value !== initialQuillContent || isValueMeaningful) {
            try {
                const delta = quill.clipboard.convert(value);
                quill.setContents(delta, 'silent');
            } catch (e) {
                console.error("Quill: Initial content conversion error", e, "HTML:", value);
                const plainText = value.replace(/<[^>]*>?/gm, '');
                quill.setText(plainText, 'silent');
            }
        }
      }

      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          const newHtml = quill.root.innerHTML;
          lastValuePropRef.current = newHtml; // Update ref on user change
          onChange(newHtml);
        }
      });
    }
  }, [readOnly, placeholder]); // Value and onChange removed from deps for init effect

  useEffect(() => {
    const quill = quillInstanceRef.current;
    // This effect handles updates to the `value` prop from the parent
    // Only update if Quill is initialized, value is a string, and it's different from the last known value
    if (quill && typeof value === 'string' && value !== lastValuePropRef.current) {
      try {
        const delta = quill.clipboard.convert(value);
        quill.setContents(delta, 'silent');
        lastValuePropRef.current = value; // Update ref after programmatic change
      } catch (e) {
        console.error("Quill: Prop update content conversion error", e, "HTML:", value);
        const plainText = value.replace(/<[^>]*>?/gm, '');
        quill.setText(plainText, 'silent');
        lastValuePropRef.current = plainText; // Update ref after programmatic change
      }
    }
  }, [value]); // This effect specifically reacts to `value` prop changes


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
      if (quillInstanceRef.current) {
        quillInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={editorRef} style={{ minHeight: '200px' }} />;
};

export default QuillEditor;
