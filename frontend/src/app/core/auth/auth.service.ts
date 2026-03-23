import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthResponse, RegisterResponse, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'aim_token';

  private _user = signal<User | null>(null);
  private _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly initialized = this._initialized.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  /** Called by APP_INITIALIZER — resolves after session check completes */
  init(): Promise<void> {
    return this.restoreSession();
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, { email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  register(email: string, password: string, fullName?: string) {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/api/auth/register`, { email, password, fullName });
  }

  verifyEmail(token: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/verify-email`, { token })
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this._user.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  updateUser(user: User) {
    this._user.set(user);
  }

  updateProfile(displayName: string | null) {
    return this.http.put<User>(`${environment.apiUrl}/api/auth/profile`, { displayName })
      .pipe(tap(user => this._user.set(user)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/api/auth/change-password`, { currentPassword, newPassword });
  }

  deleteAccount(password: string) {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/api/auth/account`, { body: { password } });
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this._user.set(res.user);
  }

  private restoreSession(): Promise<void> {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      this._initialized.set(true);
      return Promise.resolve();
    }
    return new Promise<void>(resolve => {
      this.http.get<User>(`${environment.apiUrl}/api/auth/me`).subscribe({
        next: user => {
          this._user.set(user as unknown as User);
          this._initialized.set(true);
          resolve();
        },
        error: (err) => {
          // Only remove token if the server explicitly rejected it (401/403).
          // Network errors (status 0) or server errors (5xx) should keep the token
          // so the user stays logged in once the API comes back up.
          if (err.status === 401 || err.status === 403) {
            localStorage.removeItem(this.TOKEN_KEY);
          }
          this._user.set(null);
          this._initialized.set(true);
          resolve();
        }
      });
    });
  }
}
