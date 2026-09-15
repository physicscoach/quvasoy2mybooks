"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { SendHeartbeatsPayload } from "@/types/reader";

const DB_NAME = "kutubxona-offline";
const STORE_NAME = "heartbeat-queue";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

/** Internet uzilganda heartbeat paketlarini vaqtincha saqlash navbati. */
export function useOfflineQueue() {
  async function enqueue(payload: SendHeartbeatsPayload) {
    const db = await getDb();
    if (!db) return;
    const key = `${payload.session_public_id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await db.put(STORE_NAME, { key, payload });
  }

  async function flush(send: (payload: SendHeartbeatsPayload) => Promise<unknown>) {
    const db = await getDb();
    if (!db) return;
    const all = await db.getAll(STORE_NAME);
    for (const item of all as { key: string; payload: SendHeartbeatsPayload }[]) {
      try {
        await send(item.payload);
        await db.delete(STORE_NAME, item.key);
      } catch {
        // internet hali yo'q — keyingi urinishga qoldiramiz
        break;
      }
    }
  }

  return { enqueue, flush };
}
