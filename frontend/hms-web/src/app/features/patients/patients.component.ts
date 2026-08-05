import { Component, ElementRef, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { ApiService } from '../../api.service';
import { Patient } from '../../core/models';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="grid gap-4">
      <!-- Stats -->
      <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article *ngFor="let stat of store.patientStats()" class="enterprise-panel p-5">
          <span class="inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase" [ngClass]="stat.tone">{{ stat.label }}</span>
          <strong class="mt-3 block text-3xl font-black text-slate-900">{{ stat.value }}</strong>
        </article>
      </section>

      <!-- Search + Actions -->
      <div class="enterprise-panel p-4">
        <div class="flex items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-stretch">
          <label class="field-label max-w-sm flex-1">Search
            <input class="field-control" [ngModel]="store.search()" (ngModelChange)="store.search.set($event)" placeholder="Filter patients..." [ngModelOptions]="{standalone: true}">
          </label>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" type="button" (click)="openRegisterForm()">Register Patient</button>
            <button class="btn-secondary" (click)="store.exportExcel('patients', store.patients())">Excel</button>
            <button class="btn-secondary" (click)="store.exportPdf('patients', store.patients())">PDF</button>
            <button class="btn-secondary" (click)="store.printTable('patients', store.patients())">Print</button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="enterprise-panel overflow-auto p-4">
        <table class="data-table">
          <thead><tr><th>Photo</th><th>MRN</th><th>Name</th><th>Phone</th><th>National ID</th><th>Employer</th><th>Insurance</th><th>Emergency</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of store.filtered(store.patients())">
              <td><img *ngIf="row.photoDataUrl" class="h-11 w-11 rounded-lg object-cover" [src]="row.photoDataUrl" alt="Patient"><span *ngIf="!row.photoDataUrl" class="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-xs font-black">NA</span></td>
              <td class="font-black">{{ row.mrn }}</td>
              <td>{{ row.firstName }} {{ row.lastName }}<br><span class="text-xs text-slate-500">{{ row.email || row.gender }}</span></td>
              <td>{{ row.phone }}</td>
              <td>{{ row.nationalId || '-' }}</td>
              <td>{{ row.employerName || '-' }}<br><span class="text-xs text-slate-500">{{ row.occupation }}</span></td>
              <td>{{ row.insuranceCompanyName || row.insuranceProvider || 'Self Pay' }}<br><span class="text-xs text-slate-500">{{ row.insurancePlan || row.insurancePolicyNumber }}</span></td>
              <td>{{ row.emergencyContactName || '-' }}<br><span class="text-xs text-slate-500">{{ row.emergencyContactPhone }}</span></td>
            </tr>
            <tr *ngIf="!store.patients().length"><td colspan="8" class="text-center text-slate-500 py-8">No patients registered yet</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Register Patient Modal -->
      <div *ngIf="showModal()" class="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4">
        <div class="max-h-[92vh] w-[min(880px,100%)] overflow-auto rounded-lg bg-white shadow-float">
          <div class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <h2 class="text-lg font-black text-slate-900">Register Patient</h2>
            <button class="btn-secondary" type="button" (click)="closeModal()">Close</button>
          </div>
          <form class="grid gap-4 p-5" (ngSubmit)="createPatient()">
            <div class="grid grid-cols-[150px_minmax(0,1fr)] gap-4 max-[700px]:grid-cols-1">
              <div class="grid gap-3">
                <div class="grid aspect-square place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img *ngIf="patientForm.photoDataUrl" class="h-full w-full object-cover" [src]="patientForm.photoDataUrl" alt="Patient">
                  <span *ngIf="!patientForm.photoDataUrl" class="text-xs font-black text-slate-500">NO PHOTO</span>
                </div>
                <input class="field-control" type="file" accept="image/*" (change)="onPhotoFile($event)">
              </div>
              <div class="grid gap-3">
                <video #cameraPreview class="h-40 w-full rounded-lg border border-slate-200 bg-slate-100 object-cover" muted playsinline></video>
                <canvas #cameraCanvas hidden></canvas>
                <div class="flex flex-wrap gap-2">
                  <button class="btn-secondary" type="button" (click)="startCamera()">Start Camera</button>
                  <button class="btn-secondary" type="button" (click)="capturePhoto()" [disabled]="!cameraOn()">Capture</button>
                  <button class="btn-secondary" type="button" (click)="stopCamera()" [disabled]="!cameraOn()">Stop</button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <label class="field-label">First Name<input class="field-control" name="pfn" [(ngModel)]="patientForm.firstName"></label>
              <label class="field-label">Last Name<input class="field-control" name="pln" [(ngModel)]="patientForm.lastName"></label>
              <label class="field-label">Email<input class="field-control" name="pemail" type="email" [(ngModel)]="patientForm.email"></label>
              <label class="field-label">Phone<input class="field-control" name="pphone" [(ngModel)]="patientForm.phone"></label>
              <label class="field-label">National ID<input class="field-control" name="pnid" [(ngModel)]="patientForm.nationalId"></label>
              <label class="field-label">Occupation<input class="field-control" name="pocc" [(ngModel)]="patientForm.occupation"></label>
              <label class="field-label">Gender<select class="field-control" name="pgender" [(ngModel)]="patientForm.gender"><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label class="field-label">Marital Status<select class="field-control" name="pmarital" [(ngModel)]="patientForm.maritalStatus"><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></label>
              <label class="field-label">DOB<input class="field-control" name="pdob" type="date" [(ngModel)]="patientForm.dateOfBirth"></label>
              <label class="field-label">Blood Type<select class="field-control" name="pblood" [(ngModel)]="patientForm.bloodType"><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
              <label class="field-label">Insurance<select class="field-control" name="pcompany" [ngModel]="patientForm.insuranceCompanyId" (ngModelChange)="onInsuranceChange($event)"><option value="">Self Pay / No Insurance</option><option *ngFor="let company of store.insuranceCompanies()" [value]="company.id">{{ company.name }} - {{ company.coveragePercent }}%</option></select></label>
              <label class="field-label">Provider<select class="field-control" name="pins" [(ngModel)]="patientForm.insuranceProvider"><option value="">Self Pay</option><option *ngFor="let company of store.insuranceCompanies()" [value]="company.name">{{ company.name }}</option></select></label>
              <label class="field-label">Employer<input class="field-control" name="pemployer" [(ngModel)]="patientForm.employerName"></label>
              <label class="field-label">Plan<select class="field-control" name="pplan" [(ngModel)]="patientForm.insurancePlan"><option value="">None</option><option *ngFor="let company of store.insuranceCompanies()" [value]="company.coverageType">{{ company.coverageType }} - {{ company.coveragePercent }}%</option></select></label>
              <label class="field-label">Policy No<input class="field-control" name="ppolicy" [(ngModel)]="patientForm.insurancePolicyNumber"></label>
              <label class="field-label col-span-2 max-[700px]:col-span-1">Address<input class="field-control" name="paddress" [(ngModel)]="patientForm.address"></label>
              <label class="field-label">Emergency Contact<input class="field-control" name="pec" [(ngModel)]="patientForm.emergencyContactName"></label>
              <label class="field-label">Emergency Phone<input class="field-control" name="pephone" [(ngModel)]="patientForm.emergencyContactPhone"></label>
            </div>
            <button class="btn-primary" [disabled]="store.saving()">Register Patient</button>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class PatientsComponent {
  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas?: ElementRef<HTMLCanvasElement>;
  showModal = signal(false);
  cameraOn = signal(false);

  patientForm: Omit<Patient, 'id' | 'mrn'> = this.emptyPatient();

  constructor(
    public store: StoreService,
    private api: ApiService
  ) {}

  openRegisterForm() {
    this.patientForm = this.emptyPatient();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.stopCamera();
  }

  createPatient() {
    this.store.saving.set(true);
    this.store.createPatient(this.patientForm).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.showModal.set(false);
        this.store.toast('success', 'Patient registered.');
        this.store.loadAll();
      },
      error: () => {
        this.store.saving.set(false);
        this.store.toast('error', 'Patient registration failed.');
      },
    });
  }

  onPhotoFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.patientForm.photoDataUrl = String(reader.result ?? ''));
    reader.readAsDataURL(file);
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
      this.store.toast('error', 'Camera could not start. Use photo upload instead.');
    }
  }

  capturePhoto() {
    const video = this.cameraPreview?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.patientForm.photoDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    this.store.toast('success', 'Patient photo captured.');
  }

  stopCamera() {
    const video = this.cameraPreview?.nativeElement;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    this.cameraOn.set(false);
  }

  onInsuranceChange(companyId: string) {
    const company = this.store.insuranceCompanies().find((c) => c.id === companyId);
    this.patientForm.insuranceCompanyId = companyId || undefined;
    this.patientForm.insuranceProvider = company?.name ?? '';
    this.patientForm.insurancePlan = company?.coverageType ?? '';
  }

  private emptyPatient(): Omit<Patient, 'id' | 'mrn'> {
    return {
      firstName: '', lastName: '', email: '', phone: '', gender: 'Female', dateOfBirth: '1995-01-01',
      nationalId: '', maritalStatus: 'Single', occupation: '', address: '', bloodType: 'O+',
      insuranceCompanyId: undefined, employerName: '', insurancePlan: '', insuranceProvider: '',
      insurancePolicyNumber: '', emergencyContactName: '', emergencyContactPhone: '', photoDataUrl: '',
    };
  }
}
