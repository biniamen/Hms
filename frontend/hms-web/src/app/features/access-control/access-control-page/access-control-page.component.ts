import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-access-control-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './access-control-page.component.html',
  styleUrl: './access-control-page.component.scss',
})
export class AccessControlPageComponent {
  @Input({ required: true }) vm!: any;
}

