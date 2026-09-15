"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { HeartbeatPayload } from "@/types/reader";

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
  async function enqueue(sessionId: string, heartbeats: HeartbeatPayload[]) {
    const db = await getDb();
    if (!db) return;
    const key = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await db.put(STORE_NAME, { key, sessionId, heartbeats });
  }

  async function flush(
    send: (sessionId: string, heartbeats: HeartbeatPayload[]) => Promise<unknown>
  ) {
    const db = await getDb();
    if (!db) return;
    const all = await db.getAll(STORE_NAME);
    for (const item of all as { key: string; sessionId: string; heartbeats: HeartbeatPayload[] }[]) {
      try {
        await send(item.sessionId, item.heartbeats);
        await db.delete(STORE_NAME, item.key);
      } catch {
        // internet hali yo'q — keyingi urinishga qoldiramiz
        break;
      }
    }
  }

  return { enqueue, flush };
}
