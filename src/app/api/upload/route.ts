
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'posts');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded.' }, { status: 400 });
    }

    // Basic validation for image type (can be more robust)
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ success: false, message: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }
    // Basic size validation (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'File is too large. Maximum 5MB allowed.' }, { status: 400 });
    }


    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error("Error creating upload directory:", mkdirError);
      return NextResponse.json({ success: false, message: 'Could not create upload directory.' }, { status: 500 });
    }

    // Generate a unique filename to prevent overwrites and ensure URL safety
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
