import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { User, UserRole } from '../models/simplyft.models';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'simplyft-auth-token';
  currentUser = signal<User | null>(null);
  loading = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string): Observable<User> {
    this.loading.set(true);
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        this.currentUser.set(response.user);
      }),
      map((response) => response.user),
      tap(() => this.loading.set(false)),
      catchError((error) => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  restoreSession(): Observable<User | null> {
    if (!this.token) {
      this.currentUser.set(null);
      return of(null);
    }
    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).pipe(catchError(() => of(null))).subscribe(() => {
      this.clearSession();
      this.router.navigateByUrl('/login');
    });
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  landingPathFor(user: User | null = this.currentUser()): string {
    if (!user) {
      return '/login';
    }
    return user.role === 'tecnico' ? '/field/home' : '/office/dashboard';
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
  }
}
