import { Component, OnInit, OnDestroy, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { ServiceService } from '../services/service.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-note-app',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './note-app.component.html',
  styleUrl: './note-app.component.css'
})
export class NoteAppComponent implements OnInit, OnDestroy {
  notes: any[] = [];
  panel: any = null;
  isOnline: boolean = navigator.onLine;

  // Editor fields (two-way bound)
  editorTitle: string = '';
  editorContent: string = '';
  isSaving: boolean = false;
  saveSuccess: boolean = false;

  // Offline sync badge
  pendingCount: number = 0;
  isSyncing: boolean = false;

  private pollInterval: any;
  private readonly POLL_MS = 5000;
  private readonly API_URL = 'http://localhost:8000/api/notes/';

  constructor(
    private api: ServiceService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadNotes();
    this.refreshPendingCount();
    this.startConnectivityPolling();
  }

  ngOnDestroy(): void {
    clearInterval(this.pollInterval);
  }

  // ── Connectivity Polling ───────────────────────────────────────────────────

  /**
   * Actively ping the server every POLL_MS milliseconds.
   * This is more reliable than window:online/offline events
   * which don't fire consistently on WiFi disconnection.
   */
  private startConnectivityPolling(): void {
    // Run interval OUTSIDE Angular zone — no unnecessary CD cycles
    // State mutations inside will call ngZone.run() to re-enter Angular
    this.ngZone.runOutsideAngular(() => {
      this.checkConnectivity();
      this.pollInterval = setInterval(() => this.checkConnectivity(), this.POLL_MS);
    });
  }

  private async checkConnectivity(): Promise<void> {
    const wasOnline = this.isOnline;
    let nowOnline: boolean;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch(this.API_URL, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      nowOnline = true;
    } catch {
      nowOnline = false;
    }

    // Re-enter Angular zone to update state and trigger change detection
    this.ngZone.run(async () => {
      this.isOnline = nowOnline;
      this.cdr.detectChanges();

      if (!wasOnline && nowOnline) {
        await this.onReconnect();
      }
    });
  }

  private async onReconnect(): Promise<void> {
    if (this.pendingCount > 0) {
      this.isSyncing = true;
      this.cdr.detectChanges();
      await this.api.syncPending();
      this.isSyncing = false;
    }
    await this.loadNotes();
    await this.refreshPendingCount();
    this.cdr.detectChanges();
  }

  // ── HostListeners (fast first-signal, poll corrects if wrong) ─────────────

  @HostListener('window:offline')
  setOffline(): void {
    this.isOnline = false;
  }

  @HostListener('window:online')
  async setOnline(): Promise<void> {
    // Don't trust browser event alone — let next poll confirm
    await this.checkConnectivity();
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  getDaysAgo(date: string): string {
    if (!date) return '';
    const now = new Date();
    const created = new Date(date);
    const diffs = now.setHours(0, 0, 0, 0) - created.setHours(0, 0, 0, 0);
    const days = Math.round(diffs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  async loadNotes(): Promise<void> {
    this.notes = await this.api.getNotes();
  }

  async refreshPendingCount(): Promise<void> {
    this.pendingCount = await this.api.getPendingCount();
  }

  /** Open a note in the editor */
  eventClick(id: number): void {
    this.panel = this.notes.find((note: any) => note.id === id);
    if (this.panel) {
      this.editorTitle = this.panel.title;
      this.editorContent = this.panel.content;
    }
    this.saveSuccess = false;
  }

  /** Start a brand-new blank note */
  newNote(): void {
    this.panel = null;
    this.editorTitle = '';
    this.editorContent = '';
    this.saveSuccess = false;
  }

  /** Save current editor state — create if new, update if existing */
  async saveNote(): Promise<void> {
    if (!this.editorTitle.trim()) return;
    this.isSaving = true;

    try {
      if (this.panel) {
        this.panel = await this.api.updateNote(this.panel.id, this.editorTitle, this.editorContent);
      } else {
        this.panel = await this.api.createNote(this.editorTitle, this.editorContent);
      }
      this.saveSuccess = true;
      await this.loadNotes();
      await this.refreshPendingCount();
      setTimeout(() => this.saveSuccess = false, 2000);
    } finally {
      this.isSaving = false;
    }
  }

  /** Delete the currently open note (from editor panel) */
  async deleteNote(): Promise<void> {
    if (!this.panel) return;
    await this.api.deleteNote(this.panel.id);
    this.panel = null;
    this.editorTitle = '';
    this.editorContent = '';
    await this.loadNotes();
    await this.refreshPendingCount();
  }

  /** Delete a note directly from the list (by id) */
  async deleteNoteById(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.api.deleteNote(id);
    if (this.panel?.id === id) {
      this.panel = null;
      this.editorTitle = '';
      this.editorContent = '';
    }
    await this.loadNotes();
    await this.refreshPendingCount();
  }

  /** Archive a note from the list */
  async archiveNote(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.api.archiveNote(id);
    if (this.panel?.id === id) {
      this.panel = null;
      this.editorTitle = '';
      this.editorContent = '';
    }
    await this.loadNotes();
    await this.refreshPendingCount();
  }

  // unarchive note
  async unarchiveNote(id: number): Promise<void> {
    await this.api.unarchiveNote(id);
    await this.loadNotes();
    await this.refreshPendingCount();
  }

  // delete archive note
  async deleteArchiveNote(id: number): Promise<void> {
    await this.api.deleteArchiveNote(id);
    await this.loadNotes();
    await this.refreshPendingCount();
  }

  // delete all archive notes
  async deleteAllArchiveNote(): Promise<void> {
    await this.api.deleteAllArchiveNote();
    await this.loadNotes();
    await this.refreshPendingCount();
  }
}
