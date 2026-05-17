import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="topbar">
      <div>
        <p class="muted">Back-office commerciale</p>
        <h1>Centro operativo SimpLyft</h1>
      </div>
      <div class="topbar-actions">
        <a class="btn secondary" routerLink="/field/home">Vista tecnico</a>
        <button class="btn ghost" (click)="auth.logout()">Esci</button>
      </div>
    </header>
  `
})
export class TopbarComponent {
  constructor(public auth: AuthService) {}
}
