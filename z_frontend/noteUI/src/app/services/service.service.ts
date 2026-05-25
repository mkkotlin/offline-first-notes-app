import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { db, LocalNote } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {

  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  private now(): string {
    return new Date().toISOString();
  }

  private async nextTempId(): Promise<number> {
    const all = await db.notes.toArray();
    const minId = all.reduce((min, n) => Math.min(min, n.id), 0);
    return minId - 1;
  }

  // ── Get Notes ─────────────────────────────────────────────────────────────

  async getNotes(): Promise<LocalNote[]> {
    try {
      const serverNotes = await firstValueFrom(
        this.http.get<LocalNote[]>(`${this.baseUrl}/notes/`)
      );
      // Refresh cache — keep any temp offline notes (negative id)
      const tempNotes = (await db.notes.toArray()).filter(n => n.id < 0);
      await db.notes.clear();
      await db.notes.bulkPut(serverNotes);
      if (tempNotes.length) await db.notes.bulkPut(tempNotes);
    } catch {
      // Server unreachable — serve from local cache
    }
    return db.notes.orderBy('updated_at').reverse().toArray();
  }

  // ── Create Note ───────────────────────────────────────────────────────────

  async createNote(title: string, content: string): Promise<LocalNote> {
    try {
      // Try server first
      const created = await firstValueFrom(
        this.http.post<LocalNote>(`${this.baseUrl}/notes/`, { title, content })
      );
      await db.notes.put(created);
      return created;
    } catch {
      // Server unreachable → save locally and queue
      const tempId = await this.nextTempId();
      const now = this.now();
      const localNote: LocalNote = { id: tempId, title, content, created_at: now, updated_at: now };
      await db.notes.put(localNote);
      await db.pendingOps.add({ type: 'create', payload: localNote });
      return localNote;
    }
  }

  // ── Update Note ───────────────────────────────────────────────────────────

  async updateNote(id: number, title: string, content: string): Promise<LocalNote> {
    // Temp (offline-created) notes — always handle locally
    if (id < 0) {
      const existing = await db.notes.get(id);
      const merged: LocalNote = { ...existing!, title, content, updated_at: this.now() };
      await db.notes.put(merged);
      await db.pendingOps.filter(op => op.payload.id === id).delete();
      await db.pendingOps.add({ type: 'create', payload: merged });
      return merged;
    }

    try {
      const updated = await firstValueFrom(
        this.http.put<LocalNote>(`${this.baseUrl}/notes/${id}/`, { title, content })
      );
      await db.notes.put(updated);
      return updated;
    } catch {
      // Server unreachable → update locally and queue
      const existing = await db.notes.get(id);
      const merged: LocalNote = { ...existing!, title, content, updated_at: this.now() };
      await db.notes.put(merged);
      // Deduplicate: remove old update op, add fresh one
      await db.pendingOps
        .filter(op => op.payload.id === id && op.type === 'update')
        .delete();
      await db.pendingOps.add({ type: 'update', payload: merged });
      return merged;
    }
  }

  // ── Delete Note ───────────────────────────────────────────────────────────

  async deleteNote(id: number): Promise<void> {
    await db.notes.delete(id);

    if (id < 0) {
      // Temp note — cancel its pending create op, nothing to sync
      await db.pendingOps.filter(op => op.payload.id === id).delete();
      return;
    }

    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/notes/${id}/`));
      await db.pendingOps.filter(op => op.payload.id === id).delete();
    } catch {
      // Server unreachable → queue delete
      await db.pendingOps.filter(op => op.payload.id === id).delete();
      const ghost: LocalNote = { id, title: '', content: '', created_at: '', updated_at: '' };
      await db.pendingOps.add({ type: 'delete', payload: ghost });
    }
  }

  // ── Sync Pending Ops ──────────────────────────────────────────────────────

  async syncPending(): Promise<number> {
    const ops = await db.pendingOps.orderBy('id').toArray();
    let synced = 0;

    for (const op of ops) {
      try {
        if (op.type === 'create') {
          const created = await firstValueFrom(
            this.http.post<LocalNote>(`${this.baseUrl}/notes/`, {
              title: op.payload.title,
              content: op.payload.content,
            })
          );
          await db.notes.delete(op.payload.id); // remove temp
          await db.notes.put(created);           // replace with real

        } else if (op.type === 'update' && op.payload.id > 0) {
          const updated = await firstValueFrom(
            this.http.put<LocalNote>(`${this.baseUrl}/notes/${op.payload.id}/`, {
              title: op.payload.title,
              content: op.payload.content,
            })
          );
          await db.notes.put(updated);

        } else if (op.type === 'delete' && op.payload.id > 0) {
          await firstValueFrom(
            this.http.delete(`${this.baseUrl}/notes/${op.payload.id}/`)
          );
        }

        await db.pendingOps.delete(op.id!);
        synced++;
      } catch {
        console.warn('[sync] Failed for op, retrying next reconnect:', op);
        break;
      }
    }

    return synced;
  }

  // ── Pending count ─────────────────────────────────────────────────────────

  async getPendingCount(): Promise<number> {
    return db.pendingOps.count();
  }
}
