import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BrainAnalysisResult, BrainMeshData } from './types';

interface KnowMeDB extends DBSchema {
  analyses: {
    key: string;
    value: BrainAnalysisResult;
    indexes: {
      'by-timestamp': string;
      'by-username': string;
    };
  };
  meta: {
    key: string;
    value: { key: string; data: unknown };
  };
}

let dbInstance: IDBPDatabase<KnowMeDB> | null = null;

async function getDB(): Promise<IDBPDatabase<KnowMeDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<KnowMeDB>('knowme', 1, {
    upgrade(db) {
      const analyses = db.createObjectStore('analyses', { keyPath: 'post_id' });
      analyses.createIndex('by-timestamp', 'timestamp');
      analyses.createIndex('by-username', 'post.username');

      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

export const db = {
  async saveAnalysis(result: BrainAnalysisResult): Promise<void> {
    const database = await getDB();
    await database.put('analyses', result);
  },

  async getAnalysis(postId: string): Promise<BrainAnalysisResult | undefined> {
    const database = await getDB();
    return database.get('analyses', postId);
  },

  async getHistory(limit = 50): Promise<BrainAnalysisResult[]> {
    const database = await getDB();
    const tx = database.transaction('analyses', 'readonly');
    const index = tx.store.index('by-timestamp');
    const results: BrainAnalysisResult[] = [];

    let cursor = await index.openCursor(null, 'prev'); // newest first
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }

    return results;
  },

  async saveMeta(key: string, data: unknown): Promise<void> {
    const database = await getDB();
    await database.put('meta', { key, data });
  },

  async getMeta<T>(key: string): Promise<T | undefined> {
    const database = await getDB();
    const record = await database.get('meta', key);
    return record?.data as T | undefined;
  },

  async saveBrainMesh(mesh: BrainMeshData): Promise<void> {
    await this.saveMeta('brain-mesh', mesh);
  },

  async getBrainMesh(): Promise<BrainMeshData | undefined> {
    return this.getMeta<BrainMeshData>('brain-mesh');
  },

  async clearAll(): Promise<void> {
    const database = await getDB();
    await database.clear('analyses');
    await database.clear('meta');
  },

  async getAnalysisCount(): Promise<number> {
    const database = await getDB();
    return database.count('analyses');
  },
};
