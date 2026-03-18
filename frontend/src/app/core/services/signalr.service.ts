import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import type { JobStatusUpdate } from '../models/models';

export interface JobUpdateWithProduct extends JobStatusUpdate {
  product?: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private _updates = signal<JobUpdateWithProduct | null>(null);
  readonly latestUpdate = this._updates.asReadonly();

  // Track jobId → product so notifications can show the right label
  private jobProductMap = new Map<string, string>();

  constructor(private auth: AuthService) {}

  trackJob(jobId: string, product: string) {
    this.jobProductMap.set(jobId, product);
  }

  start() {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl, {
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('JobUpdate', (update: JobStatusUpdate) => {
      const product = this.jobProductMap.get(update.jobId);
      this._updates.set({ ...update, product });
      // Clean up map after terminal state
      if (update.status === 'Completed' || update.status === 'Failed') {
        this.jobProductMap.delete(update.jobId);
      }
    });

    this.connection.start().catch(err =>
      console.error('SignalR connection error:', err)
    );
  }

  stop() {
    this.connection?.stop();
    this.connection = null;
  }
}
