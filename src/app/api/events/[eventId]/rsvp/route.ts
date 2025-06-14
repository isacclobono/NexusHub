
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Event, User } from '@/lib/types';

const eventsFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'events.json');
const usersFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'users.json'); // For user validation

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

interface RsvpParams {
  params: { eventId: string };
}

export async function POST(request: NextRequest, { params }: RsvpParams) {
  const { eventId } = params;
  if (!eventId) {
    return NextResponse.json({ message: 'Event ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json(); // User ID should be sent by the client
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required to RSVP.' }, { status: 400 });
    }

    const allUsers = await readData<User>(usersFilePath);
    const currentUser = allUsers.find(u => u.id === userId);
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const events = await readData<Event>(eventsFilePath);
    const eventIndex = events.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    const event = events[eventIndex];

    // Check if already RSVP'd
    if (event.rsvpIds.includes(userId)) {
      // Optionally allow un-RSVP by removing the ID, or just return a message
      // For now, let's assume RSVP is idempotent or we don't support un-RSVP via this POST
      return NextResponse.json({ message: 'User already RSVP\'d to this event.', event }, { status: 200 });
    }

    // Check max attendees
    if (event.maxAttendees && event.rsvpIds.length >= event.maxAttendees) {
      return NextResponse.json({ message: 'Event is full. Cannot RSVP.' }, { status: 409 }); // 409 Conflict
    }

    event.rsvpIds.push(userId);
    events[eventIndex] = event;

    await writeData<Event>(eventsFilePath, events);

    // Enrich event with organizer and rsvp user objects for the response
    const organizer = allUsers.find(u => u.id === event.organizerId);
    const rsvps = event.rsvpIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
    const enrichedEvent = {
        ...event,
        organizer: organizer || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString() } as User,
        rsvps
    };


    return NextResponse.json({ message: 'Successfully RSVP\'d to event!', event: enrichedEvent }, { status: 200 });

  } catch (error) {
    console.error(`API Error RSVPing to event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
