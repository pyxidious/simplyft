import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-field-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main class="field-shell">
      <router-outlet />
      <nav class="bottom-nav">
        <a routerLink="/field/home" routerLinkActive="active">Home</a>
        <a routerLink="/field/impianti" routerLinkActive="active">Impianti</a>
        <a routerLink="/field/nuovo-rilievo" routerLinkActive="active">Rilievi</a>
        <a routerLink="/settings" routerLinkActive="active">Profilo</a>
      </nav>
    </main>
  `
})
export class FieldShellComponent {}
