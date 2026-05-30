import "server-only";

import { MongoClient, type Db } from "mongodb";

type GlobalWithMongo = typeof globalThis & {
  __devvaultMongoClient?: MongoClient;
  __devvaultMongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as GlobalWithMongo;

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }
  return uri;
}

function getMongoDbName() {
  return process.env.MONGODB_DB_NAME?.trim() || "devvault";
}

async function getMongoClient() {
  if (globalForMongo.__devvaultMongoClient) {
    return globalForMongo.__devvaultMongoClient;
  }

  if (!globalForMongo.__devvaultMongoClientPromise) {
    const client = new MongoClient(getMongoUri());
    globalForMongo.__devvaultMongoClientPromise = client.connect();
  }

  const client = await globalForMongo.__devvaultMongoClientPromise;
  globalForMongo.__devvaultMongoClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getMongoDbName());
}

export async function closeDbForScripts() {
  if (globalForMongo.__devvaultMongoClient) {
    await globalForMongo.__devvaultMongoClient.close();
  }
  globalForMongo.__devvaultMongoClient = undefined;
  globalForMongo.__devvaultMongoClientPromise = undefined;
}
