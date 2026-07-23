import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppShellComponent } from './core/app-shell/app-shell.component';
import { HmsWorkspaceFacade } from './core/state/hms-workspace.facade';
import { ToastStackComponent } from './core/toast-stack/toast-stack.component';
import { PublicAccessComponent } from './features/auth/public-access/public-access.component';
import { ModalHostComponent } from './features/dialogs/modal-host/modal-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToastStackComponent, AppShellComponent, ModalHostComponent, PublicAccessComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly vm = inject(HmsWorkspaceFacade);
  readonly session = this.vm.session;
}
