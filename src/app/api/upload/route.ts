
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'posts');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB general limit

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/ogg',
  'application/pdf', 
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain', // .txt
  'application/rtf', // .rtf
];


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded.' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        console.log(`Upload attempt with invalid type: ${file.type}, name: ${file.name}`);
        return NextResponse.json({ success: false, message: `Invalid file type: ${file.type}. Allowed types: images, videos, pdf, doc, docx, txt, rtf.` }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ success: false, message: `File is too large. Maximum ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB allowed.` }, { status: 400 });
    }


    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error("Error creating upload directory:", mkdirError);
      return NextResponse.json({ success: false, message: 'Could not create upload directory.' }, { status: 500 });
    }

    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/posts/${uniqueFilename}`;

    return NextResponse.json({ success: true, url: publicUrl, name: file.name }, { status: 201 });

  } catch (error) {
    console.error('Upload API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during file upload.';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
