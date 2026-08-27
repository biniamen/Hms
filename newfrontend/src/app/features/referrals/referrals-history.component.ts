import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import type { MedicalCertificate, Patient, ReferralRecord } from '../../core/models';

type TimelineRow = {
  date: string;
  section: string;
  title: string;
  details: string;
  status?: string;
};

@Component({
  selector: 'app-referrals-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.24em] text-sky-600">Clinical Continuity</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950 font-display">Referrals and Clinical History</h1>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" (click)="printHistory()" [disabled]="!activePatient()" class="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40">
            <span class="material-icons align-middle text-base">print</span>
            Print History
          </button>
          <button type="button" (click)="prepareReferralSummary()" [disabled]="!activePatient()" class="rounded-2xl bg-sky-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 disabled:opacity-40">
            <span class="material-icons align-middle text-base">summarize</span>
            Prepare Referral
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
        <aside class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label class="field">Patient
            <select [(ngModel)]="selectedPatientId" name="selectedPatientId" (change)="onPatientChanged()" [class]="inputClasses">
              @for (patient of selectablePatients(); track patient.id) {
                <option [value]="patient.id">{{ patient.name }} - {{ patient.mrn }}</option>
              }
            </select>
          </label>

          @if (activePatient(); as patient) {
            <div class="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-lg font-black text-white">{{ patient.name.charAt(0) }}</div>
                <div>
                  <h2 class="text-sm font-black text-slate-950">{{ patient.name }}</h2>
                  <p class="font-mono text-[10px] font-bold text-slate-400">{{ patient.mrn }}</p>
                </div>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div class="rounded-2xl bg-white p-3"><dt class="label">Gender</dt><dd class="font-black text-slate-900">{{ patient.gender }}</dd></div>
                <div class="rounded-2xl bg-white p-3"><dt class="label">Blood</dt><dd class="font-black text-slate-900">{{ patient.bloodType }}</dd></div>
                <div class="rounded-2xl bg-white p-3"><dt class="label">Status</dt><dd class="font-black text-slate-900">{{ patient.status }}</dd></div>
                <div class="rounded-2xl bg-white p-3"><dt class="label">Certificates</dt><dd class="font-black text-slate-900">{{ store.certificatesForPatient(patient.id).length }}</dd></div>
              </dl>
              @if (patient.assignedBedNumber) {
                <div class="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  Current admission: {{ patient.assignedWard }} / Bed {{ patient.assignedBedNumber }}
                </div>
              }
            </div>
          }
        </aside>

        <section class="space-y-5">
          <div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 class="text-sm font-black text-slate-950">Clinical Timeline</h2>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{{ timeline().length }} items</span>
            </div>
            <div class="divide-y divide-slate-100">
              @for (row of timeline(); track row.section + row.date + row.title) {
                <article class="grid gap-3 p-5 md:grid-cols-[140px_160px_1fr_auto] md:items-start">
                  <div class="font-mono text-[10px] font-black text-slate-400">{{ formatDateTime(row.date) }}</div>
                  <div><span class="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700">{{ row.section }}</span></div>
                  <div>
                    <h3 class="text-sm font-black text-slate-950">{{ row.title }}</h3>
                    <p class="mt-1 text-xs font-semibold leading-relaxed text-slate-500 whitespace-pre-line">{{ row.details }}</p>
                  </div>
                  @if (row.status) {
                    <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{{ row.status }}</span>
                  }
                </article>
              } @empty {
                <div class="p-10 text-center text-xs font-bold text-slate-400">No clinical records available for this patient yet.</div>
              }
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-black text-slate-950">Approved Certificates</h2>
              <button type="button" (click)="printCertificate()" [disabled]="!latestCertificate()" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">Print Latest</button>
            </div>
            <div class="space-y-2">
              @for (cert of certificateRecords(); track cert.id) {
                <div class="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div class="font-black text-slate-900">{{ cert.reason }}</div>
                    <div class="text-slate-500">{{ cert.fitnessStatus }} • Approved by {{ cert.doctorName }}</div>
                  </div>
                  <span class="font-mono text-[10px] font-black text-slate-400">{{ formatDateTime(cert.approvedAt) }}</span>
                </div>
              } @empty {
                <div class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">No approved certificate for this patient.</div>
              }
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="mb-4 text-sm font-black text-slate-950">Referral Records</h2>
            <div class="space-y-2">
              @for (ref of referralRecords(); track ref.id) {
                <div class="grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <div>
                    <div class="font-black text-slate-900">{{ ref.facilityName }}</div>
                    <div class="text-slate-500">{{ ref.department }} • {{ ref.urgency }}</div>
                  </div>
                  <div class="text-slate-500">For {{ ref.patientName }} by {{ ref.approvedByName }}</div>
                  <button type="button" (click)="printReferral(ref)" class="rounded-xl bg-sky-600 px-4 py-2 text-[10px] font-black text-white">Print</button>
                </div>
              } @empty {
                <div class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">No referral record for this patient.</div>
              }
            </div>
          </div>

          <form (ngSubmit)="saveReferral()" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 class="text-sm font-black text-slate-950">Referral Letter</h2>
                <p class="text-xs font-semibold text-slate-500">Use for transfer to another hospital, specialty center, or diagnostic facility.</p>
              </div>
              <span class="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-700">Doctor approval required</span>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label class="field">Receiving Facility
                <input [(ngModel)]="referral.facilityName" name="facilityName" required [class]="inputClasses" placeholder="Hospital or medical center" />
              </label>
              <label class="field">Department or Unit
                <input [(ngModel)]="referral.department" name="department" required [class]="inputClasses" placeholder="Emergency, Surgery, Cardiology" />
              </label>
              <label class="field">Consultant or Receiving Team
                <input [(ngModel)]="referral.consultant" name="consultant" [class]="inputClasses" placeholder="Named consultant or receiving unit" />
              </label>
              <label class="field">Urgency
                <select [(ngModel)]="referral.urgency" name="urgency" [class]="inputClasses">
                  <option>Routine</option>
                  <option>Urgent</option>
                  <option>Emergency</option>
                </select>
              </label>
              <label class="field md:col-span-2">Reason for Referral
                <textarea [(ngModel)]="referral.reason" name="reason" rows="3" required [class]="inputClasses" placeholder="Reason for transfer or specialist review"></textarea>
              </label>
              <label class="field md:col-span-2">Clinical Summary
                <textarea [(ngModel)]="referral.clinicalSummary" name="clinicalSummary" rows="5" required [class]="inputClasses" placeholder="Relevant history, findings, diagnosis, current condition"></textarea>
              </label>
              <label class="field">Investigations
                <textarea [(ngModel)]="referral.investigations" name="investigations" rows="4" [class]="inputClasses" placeholder="Lab, imaging, ECG, ultrasound, other diagnostics"></textarea>
              </label>
              <label class="field">Treatment Given
                <textarea [(ngModel)]="referral.treatmentGiven" name="treatmentGiven" rows="4" [class]="inputClasses" placeholder="Medication, fluids, procedures, stabilization"></textarea>
              </label>
              <label class="field">Transport Mode
                <select [(ngModel)]="referral.transportMode" name="transportMode" [class]="inputClasses">
                  <option>Patient arranged</option>
                  <option>Ambulance</option>
                  <option>Wheelchair transfer</option>
                  <option>Critical care transfer</option>
                </select>
              </label>
              <label class="field">Receiving Contact
                <input [(ngModel)]="referral.contactPhone" name="contactPhone" [class]="inputClasses" placeholder="Phone number" />
              </label>
            </div>

            <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button type="button" (click)="printReferral()" [disabled]="!lastReferral()" class="rounded-xl border border-slate-200 px-5 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40">Print Last Referral</button>
              <button type="submit" class="rounded-xl bg-sky-600 px-6 py-2 text-xs font-black text-white hover:bg-sky-700">Approve and Save Referral</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .field { display: grid; gap: .4rem; font-size: .625rem; font-weight: 900; color: rgb(71 85 105); text-transform: uppercase; letter-spacing: .08em; }
    .label { font-size: .6rem; font-weight: 900; color: rgb(148 163 184); text-transform: uppercase; letter-spacing: .08em; }
  `]
})
export class ReferralsHistoryComponent {
  store = inject(StoreService);
  private route = inject(ActivatedRoute);

  selectedPatientId = '';
  readonly inputClasses = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/5';

  referral = this.defaultReferral();

  selectablePatients = computed<Patient[]>(() => {
    const history = this.store.allClinicalHistoryPatients();
    const source = history.length ? history : this.store.patients();
    return source.slice().sort((a, b) => a.name.localeCompare(b.name));
  });

  activePatient = computed(() => this.selectablePatients().find(patient => patient.id === this.selectedPatientId));
  referralRecords = computed(() => this.store.referralsForPatient(this.selectedPatientId));
  certificateRecords = computed(() => this.store.certificatesForPatient(this.selectedPatientId));
  latestCertificate = computed(() => this.certificateRecords()[0]);
  lastReferral = computed(() => this.referralRecords()[0]);

  timeline = computed<TimelineRow[]>(() => {
    const patientId = this.selectedPatientId;
    if (!patientId) return [];

    const rows: TimelineRow[] = [];
    for (const vital of this.store.clinicalVitals().filter(item => item.patientId === patientId)) {
      rows.push({ date: vital.recordedAtUtc, section: 'Vitals', title: 'Nursing vitals', details: `BP ${vital.bloodPressure}, HR ${vital.pulse}, RR ${vital.respiratoryRate}, Temp ${vital.temperatureC} C, Weight ${vital.weightKg} kg` });
    }
    for (const record of this.store.medicalRecords().filter(item => item.patientId === patientId)) {
      rows.push({ date: record.date, section: 'Encounter', title: `Encounter by ${record.doctorName}`, details: `${record.diagnosis}\n${record.clinicalNotes}` });
    }
    for (const diagnosis of this.store.clinicalDiagnoses().filter(item => item.patientId === patientId)) {
      rows.push({ date: diagnosis.diagnosedAtUtc, section: 'Diagnosis', title: `${diagnosis.code} - ${diagnosis.description}`, details: `Severity: ${diagnosis.severity}\nDoctor: ${diagnosis.doctorName}` });
    }
    for (const prescription of this.store.prescriptions().filter(item => item.patientId === patientId)) {
      rows.push({ date: prescription.date, section: 'Prescription', title: `Prescription by ${prescription.doctorName}`, details: prescription.medications.map(med => `${med.name} ${med.dosage} - ${med.frequency} - ${med.duration}`).join('\n'), status: prescription.status });
    }
    for (const lab of this.store.labOrders().filter(item => item.patientId === patientId)) {
      rows.push({ date: lab.orderedDate, section: 'Diagnostics', title: lab.testName, details: `${lab.category} / ${lab.priority || 'Routine'}\n${lab.result ? `Result: ${lab.result}` : lab.clinicalNote || ''}`, status: lab.status });
    }
    for (const cert of this.store.certificatesForPatient(patientId)) {
      rows.push({ date: cert.approvedAt, section: 'Certificate', title: cert.reason, details: `${cert.fitnessStatus}\n${cert.diagnosis}\nApproved by ${cert.doctorName}` });
    }
    for (const referral of this.store.referralsForPatient(patientId)) {
      rows.push({ date: referral.createdAt, section: 'Referral', title: `Referral to ${referral.facilityName}`, details: `${referral.reason}\n${referral.department} / ${referral.urgency}\nPrepared by ${referral.approvedByName}` });
    }

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  constructor() {
    const queryPatient = this.route.snapshot.queryParamMap.get('patient') || '';
    this.store.loadClinicalHistoryPatients();
    effect(() => {
      const patients = this.selectablePatients();
      if (!patients.length) return;
      if (!this.selectedPatientId || !patients.some(patient => patient.id === this.selectedPatientId)) {
        this.selectedPatientId = queryPatient && patients.some(patient => patient.id === queryPatient) ? queryPatient : patients[0].id;
        this.prepareReferralSummary(false);
      }
    });
  }

  onPatientChanged() {
    this.prepareReferralSummary(false);
  }

  prepareReferralSummary(showToast = true) {
    const patient = this.activePatient();
    if (!patient) return;
    const latestDiagnosis = this.store.clinicalDiagnoses().find(item => item.patientId === patient.id);
    const latestRecord = this.store.medicalRecords().find(item => item.patientId === patient.id);
    const labs = this.store.labOrders().filter(item => item.patientId === patient.id).slice(0, 5);
    const prescriptions = this.store.prescriptions().filter(item => item.patientId === patient.id).slice(0, 3);

    this.referral = {
      ...this.defaultReferral(),
      reason: latestDiagnosis?.description || patient.primaryCondition || '',
      clinicalSummary: [
        `${patient.name} (${patient.mrn}), ${patient.gender}, blood group ${patient.bloodType}.`,
        latestRecord?.clinicalNotes || '',
        latestDiagnosis ? `Latest diagnosis: ${latestDiagnosis.code} - ${latestDiagnosis.description}.` : '',
      ].filter(Boolean).join('\n'),
      investigations: labs.map(item => `${item.testName}: ${item.status}${item.result ? ` - ${item.result}` : ''}`).join('\n'),
      treatmentGiven: prescriptions.map(item => item.medications.map(med => `${med.name} ${med.dosage}`).join('; ')).join('\n'),
      urgency: this.store.patientHasEmergencyAppointment(patient.id) ? 'Emergency' : 'Routine',
    };

    if (showToast) this.store.addToast('info', 'Referral Draft Prepared', 'Patient history has been summarized into the referral form.');
  }

  saveReferral() {
    const patient = this.activePatient();
    if (!patient) {
      this.store.addToast('error', 'Patient Required', 'Select a patient before saving the referral.');
      return;
    }
    if (!this.referral.facilityName.trim() || !this.referral.department.trim() || !this.referral.reason.trim() || !this.referral.clinicalSummary.trim()) {
      this.store.addToast('error', 'Referral Validation', 'Facility, department, reason, and clinical summary are required.');
      return;
    }

    const draft = this.store.saveReferralRecord({
      ...this.referral,
      patientId: patient.id,
      patientName: patient.name,
      patientMrn: patient.mrn,
      approvedById: this.store.currentUser()?.id || '',
      approvedByName: this.store.currentUser()?.name || 'Clinician',
    });
    this.store.createEnterpriseRecord({
      area: 'Referral',
      patientId: patient.id,
      title: `Referral to ${draft.facilityName}`,
      department: draft.department,
      owner: draft.approvedByName,
      priority: draft.urgency,
      status: 'Prepared',
      amount: 0,
      details: `${draft.reason}\n\n${draft.clinicalSummary}`,
      dueAtUtc: new Date().toISOString(),
    }).subscribe({ next: () => {}, error: () => {} });
    this.store.addToast('success', 'Referral Approved', 'Referral letter is saved and ready to print.');
  }

  printReferral(draft = this.lastReferral()) {
    const patient = this.activePatient();
    if (!draft || !patient) return;
    this.openPrintWindow('Referral Letter', this.referralHtml(patient, draft));
  }

  printCertificate(certificate = this.latestCertificate()) {
    const patient = this.activePatient();
    if (!certificate || !patient) return;
    this.openPrintWindow('Medical Certificate', this.certificateHtml(patient, certificate));
  }

  printHistory() {
    const patient = this.activePatient();
    if (!patient) return;
    this.openPrintWindow('Complete Patient History', this.historyHtml(patient, this.timeline()));
  }

  formatDateTime(value?: string): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
  }

  private defaultReferral() {
    return {
      patientId: '',
      facilityName: '',
      department: '',
      consultant: '',
      urgency: 'Routine',
      reason: '',
      clinicalSummary: '',
      investigations: '',
      treatmentGiven: '',
      transportMode: 'Patient arranged',
      contactPhone: '',
    };
  }

  private openPrintWindow(title: string, html: string) {
    const printWindow = window.open('', '_blank', 'width=980,height=720');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private shell(title: string, body: string): string {
    return `<!doctype html><html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;margin:0;background:#e5e7eb;color:#0f172a}.page{width:210mm;min-height:297mm;margin:18px auto;background:white;padding:16mm;box-shadow:0 18px 50px rgba(15,23,42,.18)}.brand{display:grid;grid-template-columns:1fr 150px;border:2px solid #111827}.hospital{text-align:center;padding:12px;border-right:2px solid #111827}.hospital h2{margin:0;font-size:17px;letter-spacing:.08em}.hospital p{margin:4px 0 0;font-size:10px;color:#475569}.docbox{text-align:center;padding:10px;font-size:10px}.title{border:2px solid #111827;border-top:0;padding:8px 12px;font-size:12px}.footer{position:fixed;bottom:10mm;left:16mm;right:16mm;border-top:1px solid #94a3b8;padding-top:6px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}.muted{color:#64748b;font-size:12px}.section{margin-top:18px}.box{border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.row{border-bottom:1px solid #e2e8f0;padding:10px 0}.label{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:.08em}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:12px;line-height:1.5}@media print{body{background:white}.page{margin:0;box-shadow:none}.footer{position:fixed}}
      </style></head><body><section class="page"><div class="brand"><div class="hospital"><h2>BETHZATHA GENERAL HOSPITAL</h2><p>Addis Ababa, Ethiopia | Tel: +251-115-535980 | info@bethzatha.com</p></div><div class="docbox">Document<br><strong>${title}</strong></div></div><div class="title"><strong>Document Title:</strong> ${title} &nbsp; | &nbsp; <strong>Revision:</strong> 0</div>${body}<div class="footer"><span>Bethzatha General Hospital</span><span>Printed ${new Date().toLocaleString()}</span></div></section></body></html>`;
  }

  private referralHtml(patient: Patient, draft: ReferralRecord): string {
    return this.shell('Referral Letter', `<div class="grid"><div class="box"><div class="label">Patient</div><strong>${patient.name}</strong><br>${patient.mrn}</div><div class="box"><div class="label">Receiving Facility</div><strong>${draft.facilityName}</strong><br>${draft.department}</div></div><div class="section box"><div class="label">Reason for Referral</div><pre>${draft.reason}</pre></div><div class="section box"><div class="label">Clinical Summary</div><pre>${draft.clinicalSummary}</pre></div><div class="grid section"><div class="box"><div class="label">Investigations</div><pre>${draft.investigations || 'Not specified'}</pre></div><div class="box"><div class="label">Treatment Given</div><pre>${draft.treatmentGiven || 'Not specified'}</pre></div></div><div class="section box"><div class="label">Transfer</div><pre>Urgency: ${draft.urgency}\nTransport: ${draft.transportMode}\nContact: ${draft.contactPhone || 'Not specified'}\nApproved by: ${draft.approvedByName}</pre></div>`);
  }

  private certificateHtml(patient: Patient, certificate: MedicalCertificate): string {
    return this.shell('Medical Certificate', `<div class="grid"><div class="box"><div class="label">Patient</div><strong>${patient.name}</strong><br>${patient.mrn}</div><div class="box"><div class="label">Approved By</div><strong>${certificate.doctorName}</strong><br>${this.formatDateTime(certificate.approvedAt)}</div></div><div class="section box"><div class="label">Reason</div><pre>${certificate.reason}</pre></div><div class="section box"><div class="label">Assessment</div><pre>${certificate.diagnosis}</pre></div><div class="grid section"><div class="box"><div class="label">Fitness</div><pre>${certificate.fitnessStatus}</pre></div><div class="box"><div class="label">Rest Period</div><pre>${certificate.startDate} to ${certificate.endDate}\n${certificate.restDays} day(s)</pre></div></div><div class="section box"><div class="label">Advice</div><pre>${certificate.restrictions || 'None recorded'}</pre></div>`);
  }

  private historyHtml(patient: Patient, rows: TimelineRow[]): string {
    const rowHtml = rows.map(row => `<div class="row"><div class="label">${this.formatDateTime(row.date)} - ${row.section} ${row.status ? '(' + row.status + ')' : ''}</div><strong>${row.title}</strong><pre>${row.details}</pre></div>`).join('');
    return this.shell('Clinical Patient History', `<div class="grid"><div class="box"><div class="label">Patient</div><strong>${patient.name}</strong><br>${patient.mrn}</div><div class="box"><div class="label">Clinical Records</div><strong>${rows.length}</strong><br>Billing and administrative records excluded</div></div><div class="section box"><div class="label">Clinical Timeline</div>${rowHtml || '<p class="muted">No records available.</p>'}</div>`);
  }
}
