import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServiceService } from '../services/service.service';

@Component({
  selector: 'app-archive',
  imports: [CommonModule, RouterModule],
  templateUrl: './archive.component.html',
  styleUrl: './archive.component.css'
})
export class ArchiveComponent implements OnInit {
  archivedNotes: any[] = [];
  isLoading = true;
  isDeleting = false;

  constructor(private api: ServiceService) {}

  ngOnInit(): void {
    this.loadArchived();
  }

  async loadArchived(): Promise<void> {
    this.isLoading = true;
    try {
      this.archivedNotes = await this.api.getArchivedNotes();
    } finally {
      this.isLoading = false;
    }
  }

  async unarchive(noteId: number): Promise<void> {
    await this.api.unarchiveNote(noteId);
    await this.loadArchived();
  }

  async deleteOne(noteId: number): Promise<void> {
    await this.api.deleteArchiveNote(noteId);
    await this.loadArchived();
  }

  async deleteAll(): Promise<void> {
    if (!this.archivedNotes.length) return;
    this.isDeleting = true;
    try {
      await this.api.deleteAllArchiveNote();
      this.archivedNotes = [];
    } finally {
      this.isDeleting = false;
    }
  }

  getDaysAgo(date: string): string {
    if (!date) return '';
    const now = new Date();
    const created = new Date(date);
    const diff = now.setHours(0,0,0,0) - created.setHours(0,0,0,0);
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
}
