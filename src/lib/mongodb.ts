
import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI". Please ensure it is set in your .env.local file.');
}
if (!process.env.MONGODB_DB_NAME) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_DB_NAME". Please ensure it is set in your .env.local file.');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

// Log the URI to help with debugging connection issues.
// This will appear in your Next.js server console, not the browser console.
console.log(`Attempting to connect to MongoDB with URI: ${uri}`);
console.log(`Using database name: ${dbName}`);


// Extend the NodeJS.Global interface to include our MongoDB client promise
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Development: Creating new MongoDB client promise.');
    global._mongoClientPromise = client.connect()
      .then(client => {
        console.log('Development: MongoDB client connected successfully.');
        return client;
      })
      .catch(err => {
        console.error('Development: MongoDB client connection error:', err);
        // Removing the promise from global cache if connection fails,
        // so next attempt will try to re-establish.
        delete global._mongoClientPromise; 
        throw err; // Re-throw to indicate failure
      });
  } else {
    console.log('Development: Reusing existing MongoDB client promise.');
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  console.log('Production: Creating new MongoDB client and connecting.');
  clientPromise = client.connect()
    .then(client => {
      console.log('Production: MongoDB client connected successfully.');
      return client;
    })
    .catch(err => {
      console.error('Production: MongoDB client connection error:', err);
      throw err; // Re-throw to indicate failure
    });
}

async function getDb() {
  if (!clientPromise) {
    // This case should ideally not be hit if logic above is correct,
    // but as a safeguard:
    console.error("MongoDB client promise not initialized!");
    throw new Error("MongoDB client promise not initialized!");
  }
  try {
    const mongoClient = await clientPromise;
    return mongoClient.db(dbName);
  } catch (error) {
    console.error("Failed to get DB instance from client promise:", error);
    // If the promise was rejected, this will re-throw the connection error.
    // This helps propagate the error to the API route handler.
    throw error;
  }
}

export default getDb;
