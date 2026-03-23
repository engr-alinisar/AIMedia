import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginModalService } from './core/services/login-modal.service';
import { LoginModalComponent } from './shared/components/login-modal/login-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LoginModalComponent],
  template: `
    <router-outlet/>
    @if (loginModal.isOpen()) {
      <app-login-modal/>
    }
  `
})
export class App {
  loginModal = inject(LoginModalService);
}
