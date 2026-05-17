import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="office-page settings-page">
      <div class="card">
        <h2>Profilo e impostazioni</h2>
        <p class="muted">Sessione autenticata collegata al backend. Il localStorage conserva solo il token.</p>
        <div class="info-grid">
          <p><span>Utente</span><b>{{ auth.currentUser()?.name || 'Demo' }}</b></p>
          <p><span>Ruolo</span><b>{{ auth.currentUser()?.role || 'Non disponibile' }}</b></p>
          <p><span>Profilo</span><b>{{ auth.currentUser()?.title || 'Non disponibile' }}</b></p>
          <p><span>Ambiente</span><b>API backend reali</b></p>
        </div>
        <div class="button-row">
          <a class="btn secondary" routerLink="/field/home">App tecnico</a>
          <a class="btn secondary" routerLink="/office/dashboard">Back-office</a>
          <button class="btn ghost" (click)="auth.logout()">Logout</button>
        </div>
      </div>
    </section>
  `
})
export class SettingsComponent {
  constructor(public auth: AuthService) {}
}
