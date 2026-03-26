import { Injectable, signal, computed } from '@angular/core';
import type { JobStatusUpdate, ProductType } from '../models/models';

export interface AppNotification {
  id: string;
  jobId: string;
  type: 'completed' | 'failed';
  product: string;
  message: string;
  outputUrl?: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = 'aimedia_notifications';
const MAX_NOTIFICATIONS = 50;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<AppNotification[]>(this.loadFromStorage());

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  addFromJobUpdate(update: JobStatusUpdate, product: string) {
    if (update.status !== 'Completed' && update.status !== 'Failed') return;

    const productLabel: Record<string, string> = {
      ImageGen: 'Image Generation', ImageToVideo: 'Image to Video',
      TextToVideo: 'Text to Video', Voice: 'Text to Audio',
      Transcription: 'Transcription', BackgroundRemoval: 'Background Removal'
    };

    const label = productLabel[product] ?? product;
    const n: AppNotification = {
      id: crypto.randomUUID(),
      jobId: update.jobId,
      type: update.status === 'Completed' ? 'completed' : 'failed',
      product,
      message: update.status === 'Completed'
        ? `${label} completed successfully`
        : `${label} failed — ${update.errorMessage ?? 'unknown error'}`,
      outputUrl: update.outputUrl,
      createdAt: new Date().toISOString(),
      read: false
    };

    const current = this._notifications();
    const updated = [n, ...current].slice(0, MAX_NOTIFICATIONS);
    this._notifications.set(updated);
    this.saveToStorage(updated);
  }

  markRead(id: string) {
    const updated = this._notifications().map(n => n.id === id ? { ...n, read: true } : n);
    this._notifications.set(updated);
    this.saveToStorage(updated);
  }

  markAllRead() {
    const updated = this._notifications().map(n => ({ ...n, read: true }));
    this._notifications.set(updated);
    this.saveToStorage(updated);
  }

  clearAll() {
    this._notifications.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadFromStorage(): AppNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveToStorage(notifications: AppNotification[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); }
    catch { /* storage full */ }
  }
}
