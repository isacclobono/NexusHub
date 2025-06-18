
import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_URI_FROM_ENV = process.env.MONGODB_URI || "mongodb://localhost:27017/testdb_next_default";
const MONGODB_DB_NAME_FROM_ENV = process.env.MONGODB_DB_NAME || "testdb_next_default";

console.log('[MongoDB Init] MONGODB_URI used:', MONGODB_URI_FROM_ENV);
console.log('[MongoDB Init] MONGODB_DB_NAME used:', MONGODB_DB_NAME_FROM_ENV);

// No longer throwing an error if undefined, as we are providing defaults.
// if (!MONGODB_URI_FROM_ENV) {
//   console.error('[MongoDB Init] CRITICAL ERROR: "MONGODB_URI" environment variable is missing or undefined.');
//   throw new Error('Invalid/Missing environment variable: "MONGODB_URI". Please ensure it is set in your .env.local file and the server is restarted.');
// }
// if (!MONGODB_DB_NAME_FROM_ENV) {
//   console.error('[MongoDB Init] CRITICAL ERROR: "MONGODB_DB_NAME" environment variable is missing or undefined.');
//   throw new Error('Invalid/Missing environment variable: "MONGODB_DB_NAME". Please ensure it is set in your .env.local file and the server is restarted.');
// }

const uri = MONGODB_URI_FROM_ENV;
const dbName = MONGODB_DB_NAME_FROM_ENV;

console.log(`[MongoDB Lib] Attempting to connect to MongoDB with URI: ${uri}`);
console.log(`[MongoDB Lib] Using database name: ${dbName}`);

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
    console.log('[MongoDB Lib] Development: Creating new MongoDB client promise.');
    global._mongoClientPromise = client.connect()
      .then(connectedClient => { // Renamed to avoid conflict with outer 'client'
        console.log('[MongoDB Lib] Development: MongoDB client connected successfully.');
        return connectedClient;
      })
      .catch(err => {
        console.error('[MongoDB Lib] Development: MongoDB client connection error:', err);
        delete global._mongoClientPromise; 
        throw err;
      });
  } else {
    console.log('[MongoDB Lib] Development: Reusing existing MongoDB client promise.');
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
  console.log('[MongoDB Lib] Production: Creating new MongoDB client and connecting.');
  clientPromise = client.connect()
    .then(connectedClient => { // Renamed
      console.log('[MongoDB Lib] Production: MongoDB client connected successfully.');
      return connectedClient;
    })
    .catch(err => {
      console.error('[MongoDB Lib] Production: MongoDB client connection error:', err);
      throw err;
    });
}

async function getDb() {
  if (!clientPromise) {
    console.error("[MongoDB Lib] getDb Error: MongoDB client promise not initialized!");
    throw new Error("MongoDB client promise not initialized!");
  }
  try {
    const mongoClient = await clientPromise;
    // console.log('[MongoDB Lib] getDb: Successfully awaited clientPromise.');
    return mongoClient.db(dbName);
  } catch (error) {
    console.error("[MongoDB Lib] getDb Error: Failed to get DB instance from client promise:", error);
    throw error;
  }
}

export default getDb;
