
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type { Event, User } from '@/lib/types';

// IMPORTANT: File system operations in serverless environments can be tricky.
// This approach is suitable for local development but may not work or persist
// in many production serverless hosting environments.
// A database is recommended for production.

const eventsFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'events.json');
const usersFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'users.json');

async function readData<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error(`Error reading ${filePath}:`, error);
    throw new Error(`Could not read data from ${filePath}.`);
  }
}

async function writeData<T>(filePath: string, data: T[]): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw new Error(`Could not save data to ${filePath}.`);
  }
}

const eventFormSchema = z.object({
  organizerId: z.string(), // This should come from authenticated user session
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000),
  startTime: z.string().datetime({ message: "Invalid start date format. Expected ISO string."}),
  endTime: z.string().datetime({ message: "Invalid end date format. Expected ISO string."}),
  location: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string
  maxAttendees: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  imageUrl: z.string().url().optional(),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End date and time must be after start date and time.",
  path: ["endTime"],
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In a real app, organizerId would be from session/auth token.
    // For now, the client must send it.
    if (!body.organizerId) {
        return NextResponse.json({ message: 'Organizer ID is required.' }, { status: 400 });
    }
    const allUsers = await readData<User>(usersFilePath);
    const organizer = allUsers.find(u => u.id === body.organizerId);
    if (!organizer) {
        return NextResponse.json({ message: 'Organizer not found.' }, { status: 404 });
    }

    const validation = eventFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid event data.', errors: validation.error.errors }, { status: 400 });
    }
    const data = validation.data;

    const newEvent: Event = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organizerId: data.organizerId,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      category: data.category,
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      maxAttendees: data.maxAttendees,
      imageUrl: data.imageUrl || `https://placehold.co/1200x400.png`,
      rsvpIds: [], // Initially no RSVPs
    };

    const events = await readData<Event>(eventsFilePath);
    events.unshift(newEvent); // Add to the beginning
    await writeData<Event>(eventsFilePath, events);

    return NextResponse.json({ message: 'Event created successfully!', event: newEvent }, { status: 201 });

  } catch (error) {
    console.error('API Error creating event:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const events = await readData<Event>(eventsFilePath);
    const users = await readData<User>(usersFilePath);

    const enrichedEvents = events.map(event => {
      const organizer = users.find(u => u.id === event.organizerId);
      const rsvps = event.rsvpIds.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];
      return {
        ...event,
        organizer: organizer || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString() } as User,
        rsvps,
      };
    });
    return NextResponse.json(enrichedEvents, { status: 200 });
  } catch (error) {
    console.error('API Error fetching events:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
