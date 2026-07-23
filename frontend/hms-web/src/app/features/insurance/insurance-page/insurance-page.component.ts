import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-insurance-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insurance-page.component.html',
  styleUrl: './insurance-page.component.scss',
})
export class InsurancePageComponent {
  @Input({ required: true }) vm!: any;
}

