import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-field-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main class="field-shell">
      <router-outlet />
      <nav class="bottom-nav mobile-global-nav" aria-label="Navigazione principale">
        <a routerLink="/field/home" routerLinkActive="active">
          <span>⌂</span>
          <small>Home</small>
        </a>
        <a routerLink="/field/nuovo-rilievo" routerLinkActive="active">
          <span>＋</span>
          <small>Nuovo</small>
        </a>
        <a routerLink="/field/rilievi" routerLinkActive="active">
          <span>▤</span>
          <small>Rilievi</small>
        </a>
        <a routerLink="/field/profilo" routerLinkActive="active">
          <span>◌</span>
          <small>Profilo</small>
        </a>
      </nav>
    </main>
  `
})
export class FieldShellComponent {}
