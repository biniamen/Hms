import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-system-health-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-health-page.component.html',
  styleUrl: './system-health-page.component.scss',
})
export class SystemHealthPageComponent {
  @Input({ required: true }) vm!: any;
}

