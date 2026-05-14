import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <a class="brand" routerLink="/office/dashboard"><span>S</span><b>SimpLyft</b></a>
      <nav>
        <a routerLink="/office/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/office/preventivi" routerLinkActive="active">Preventivi</a>
        <a routerLink="/office/pipeline" routerLinkActive="active">Pipeline</a>
        <a routerLink="/settings" routerLinkActive="active">Impostazioni</a>
      </nav>
      <div class="sidebar-note">Campo e ufficio sincronizzati con dati mock locali.</div>
    </aside>
  `
})
export class SidebarComponent {}
