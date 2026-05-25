import Dexie, { Table } from 'dexie';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface LocalNote {
  id: number;          // negative = temp id for offline-created notes
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type PendingOpType = 'create' | 'update' | 'delete';

export interface PendingOp {
  id?: number;                  // auto-incremented local key
  type: PendingOpType;
  payload: LocalNote;           // snapshot at the time of the operation
}

// ── Database ─────────────────────────────────────────────────────────────────

export class NotesDatabase extends Dexie {
  notes!: Table<LocalNote, number>;
  pendingOps!: Table<PendingOp, number>;

  constructor() {
    super('NotesAppDB');
    this.version(1).stores({
      notes: 'id, title, updated_at',
      pendingOps: '++id, type',
    });
  }
}

export const db = new NotesDatabase();
