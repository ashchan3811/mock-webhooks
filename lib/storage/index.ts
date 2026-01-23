/**
 * Storage factory - returns the appropriate storage implementation
 */
import { IStorage } from "./interface";
import { MemoryStorage } from "./memory";

// Determine which storage to use based on environment
const STORAGE_TYPE = process.env.STORAGE_TYPE || "memory";

let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (storageInstance) {
    return storageInstance;
  }

  switch (STORAGE_TYPE) {
    case "memory":
      storageInstance = new MemoryStorage();
      break;
    // Future: Add database implementations here
    // case "postgres":
    //   storageInstance = new PostgresStorage();
    //   break;
    // case "mongodb":
    //   storageInstance = new MongoStorage();
    //   break;
    default:
      storageInstance = new MemoryStorage();
  }

  return storageInstance;
}

// Export types
export type { IStorage, StorageStats } from "./interface";
