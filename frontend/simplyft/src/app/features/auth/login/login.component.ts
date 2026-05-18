import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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