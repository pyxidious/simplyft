import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="office-shell">
      <app-sidebar />
      <main>
        <app-topbar />
        <router-outlet />
      </main>
    </div>
  `
})
export class AppShellComponent {}
