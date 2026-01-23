/**
 * Storage factory - returns the appropriate storage implementation
 */
import { IStorage } from "./interface";
import { MemoryStorage } from "./memory";
import { TursoStorage } from "./turso";

// Determine which storage to use based on environment
const STORAGE_TYPE = process.env.STORAGE_TYPE || "memory";

let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (storageInstance) {
    return storageInstance;
  }

  switch (STORAGE_TYPE.toLowerCase()) {
    case "memory":
      storageInstance = new MemoryStorage();
      break;
    case "turso":
      storageInstance = new TursoStorage();
      break;
    // Future: Add more database implementations here
    // case "postgres":
    //   storageInstance = new PostgresStorage();
    //   break;
    // case "mongodb":
    //   storageInstance = new MongoStorage();
    //   break;
    default:
      console.warn(`Unknown storage type: ${STORAGE_TYPE}, falling back to memory`);
      storageInstance = new MemoryStorage();
  }

  return storageInstance;
}

// Export types
export type { IStorage, StorageStats } from "./interface";
