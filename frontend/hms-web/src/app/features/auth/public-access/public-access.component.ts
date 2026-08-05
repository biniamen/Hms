import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-public-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-access.component.html',
  styleUrl: './public-access.component.scss',
})
export class PublicAccessComponent {
  @Input({ required: true }) vm!: any;
}

