import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="logo-mark">S</div>
        <h1>SimpLyft</h1>
        <p>Accedi con un utente reale del database per lavorare su dati persistenti.</p>
        <form class="login-form" (ngSubmit)="login()">
          <label class="field">
            <span>Email</span>
            <input type="email" name="email" [(ngModel)]="email" autocomplete="username" required />
          </label>
          <label class="field">
            <span>Password</span>
            <input type="password" name="password" [(ngModel)]="password" autocomplete="current-password" required />
          </label>
          <p class="voice-error" *ngIf="error">{{ error }}</p>
          <button class="btn primary wide" type="submit" [disabled]="auth.loading() || !email.trim() || !password">
            {{ auth.loading() ? 'Accesso in corso...' : 'Accedi' }}
          </button>
        </form>
        <p class="muted">Demo seed: tecnico&#64;simplyft.local, commerciale&#64;simplyft.local, admin&#64;simplyft.local. Password: password</p>
      </section>
    </main>
  `
})
export class LoginComponent {
  email = 'tecnico@simplyft.local';
  password = 'password';
  error = '';

  constructor(public auth: AuthService, private router: Router) {}

  login(): void {
    this.error = '';
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (user) => this.router.navigateByUrl(this.auth.landingPathFor(user)),
      error: () => this.error = 'Credenziali non valide o backend non raggiungibile.'
    });
  }
}
