import { Component } from '@angular/core';
import { AuthMockService } from '../../../core/services/auth-mock.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="logo-mark">S</div>
        <h1>SimpLyft</h1>
        <p>Dal sopralluogo tecnico al preventivo, senza ricostruire i dati due volte.</p>
        <div class="role-grid">
          <button class="role-card" (click)="auth.loginAs('technician')">
            <span>Tecnico</span>
            <b>App mobile campo</b>
            <small>Rilievi guidati, foto, note vocali, checklist.</small>
          </button>
          <button class="role-card" (click)="auth.loginAs('office')">
            <span>Back-office</span>
            <b>Dashboard commerciale</b>
            <small>Opportunita normalizzate, costi, margini, pipeline.</small>
          </button>
        </div>
      </section>
    </main>
  `
})
export class LoginComponent {
  constructor(public auth: AuthMockService) {}
}
