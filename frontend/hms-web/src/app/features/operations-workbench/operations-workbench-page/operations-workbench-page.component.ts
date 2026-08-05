import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-operations-workbench-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './operations-workbench-page.component.html',
  styleUrl: './operations-workbench-page.component.scss',
})
export class OperationsWorkbenchPageComponent {
  @Input({ required: true }) vm!: any;
}

