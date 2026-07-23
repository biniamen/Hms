import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-toast-stack',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toast-stack.component.html',
  styleUrl: './toast-stack.component.scss',
})
export class ToastStackComponent {
  @Input({ required: true }) vm!: any;
}

