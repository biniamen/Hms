import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-appointments-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.scss',
})
export class AppointmentsPageComponent {
  @Input({ required: true }) vm!: any;
}

