import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole } from '../models/simplyft.models';
import { MOCK_USERS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class AuthMockService {
  currentUser = signal<User | null>(this.restoreUser());

  constructor(private router: Router) {}

  loginAs(role: UserRole): void {
    const user = MOCK_USERS.find((item) => item.role === role) ?? MOCK_USERS[0];
    this.currentUser.set(user);
    localStorage.setItem('simplyft-user', JSON.stringify(user));
    this.router.navigateByUrl(role === 'technician' ? '/field/home' : '/office/dashboard');
  }

  logout(): void {
    localStorage.removeItem('simplyft-user');
    this.currentUser.set(null);
    this.router.navigateByUrl('/login');
  }

  private restoreUser(): User | null {
    const raw = localStorage.getItem('simplyft-user');
    return raw ? JSON.parse(raw) as User : null;
  }
}
