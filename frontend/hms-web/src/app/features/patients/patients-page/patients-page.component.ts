import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-patients-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-page.component.html',
  styleUrl: './patients-page.component.scss',
})
export class PatientsPageComponent {
  @Input({ required: true }) vm!: any;
}

