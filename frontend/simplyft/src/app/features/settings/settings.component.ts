import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthMockService } from '../../core/services/auth-mock.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="office-page settings-page">
      <div class="card">
        <h2>Profilo e impostazioni</h2>
        <p class="muted">Dark mode attiva, mock data in localStorage, nessuna API reale configurata.</p>
        <div class="info-grid">
          <p><span>Utente</span><b>{{ auth.currentUser()?.name || 'Demo' }}</b></p>
          <p><span>Ruolo</span><b>{{ auth.currentUser()?.title || 'Prototipo' }}</b></p>
          <p><span>Stato tecnico</span><b>Online / Offline simulato</b></p>
          <p><span>Ambiente</span><b>Frontend Angular mock</b></p>
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
  constructor(public auth: AuthMockService) {}
}
