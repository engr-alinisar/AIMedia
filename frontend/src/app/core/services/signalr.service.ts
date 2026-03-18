import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import type { JobStatusUpdate } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private _updates = signal<JobStatusUpdate | null>(null);
  readonly latestUpdate = this._updates.asReadonly();

  constructor(private auth: AuthService) {}

  start() {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl, {
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('JobUpdate', (update: JobStatusUpdate) => {
      this._updates.set(update);
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
