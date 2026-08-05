import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-clinical-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clinical-page.component.html',
  styleUrl: './clinical-page.component.scss',
})
export class ClinicalPageComponent {
  @Input({ required: true }) vm!: any;
}

