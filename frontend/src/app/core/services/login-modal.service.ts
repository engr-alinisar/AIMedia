import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoginModalService {
  readonly isOpen = signal(false);
  readonly mode = signal<'login' | 'register'>('login');

  show(mode: 'login' | 'register' = 'login') {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  hide() { this.isOpen.set(false); }
}
