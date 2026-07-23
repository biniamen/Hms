import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-staff-directory-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-directory-page.component.html',
  styleUrl: './staff-directory-page.component.scss',
})
export class StaffDirectoryPageComponent {
  @Input({ required: true }) vm!: any;
}

