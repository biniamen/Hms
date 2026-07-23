import { CommonModule } from '@angular/common';
import { Component, DoCheck, ElementRef, Input, OnDestroy, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'hms-modal-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-host.component.html',
  styleUrl: './modal-host.component.scss',
})
export class ModalHostComponent implements DoCheck, OnDestroy {
  @Input({ required: true }) vm!: any;
  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas?: ElementRef<HTMLCanvasElement>;

  readonly cameraOn = signal(false);
  private lastModal: string | null = null;

  ngDoCheck() {
    const current = this.vm?.modal?.() ?? null;
    if (this.lastModal && !current) {
      this.stopCamera();
    }
    this.lastModal = current;
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (this.cameraPreview?.nativeElement) {
        this.cameraPreview.nativeElement.srcObject = stream;
        await this.cameraPreview.nativeElement.play();
        this.cameraOn.set(true);
      }
    } catch {
      this.showToast('error', 'Camera could not start. Use photo upload instead.');
    }
  }

  capturePhoto() {
    const video = this.cameraPreview?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.vm.patientForm.photoDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    this.showToast('success', 'Patient photo captured.');
  }

  stopCamera() {
    const video = this.cameraPreview?.nativeElement;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
    this.cameraOn.set(false);
  }

  private showToast(kind: 'success' | 'error' | 'info', message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.vm.toasts?.update((items: any[]) => [...items, { id, kind, message }]);
    window.setTimeout(() => this.vm.dismissToast?.(id), 4800);
  }
}

