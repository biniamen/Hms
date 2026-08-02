import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StoreService } from '../../core/services/store.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: () => number | string;
  allowedRoles?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased overflow-x-hidden">
      
      <!-- MOBILE BACKDROP OVERLAY -->
      @if (isMobileMenuOpen()) {
        <button 
          type="button"
          (click)="toggleMobileMenu()" 
          class="fixed inset-0 bg-slate-900/30 z-40 lg:hidden animate-fade-in w-full h-full border-none p-0 cursor-default">
        </button>
      }

      <!-- SIDEBAR -->
      <aside 
        [class]="(isMobileMenuOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0') + ' ' + (isSidebarCollapsed() ? 'lg:w-20' : 'lg:w-64')"
        class="fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-all duration-300 border-r border-slate-800">
        
        <!-- Sidebar Brand Header -->
        <div class="p-6 flex items-center justify-between">
          <a routerLink="/dashboard" class="flex items-center space-x-3 overflow-hidden">
            <div class="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </div>
            @if (!isSidebarCollapsed()) {
              <span class="font-black text-xl tracking-tight text-white">HMS Pro</span>
            }
          </a>

          <!-- Desktop Collapse Toggle -->
          <button 
            (click)="toggleSidebarCollapse()" 
            class="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <span class="material-icons text-lg">{{ isSidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 space-y-1 mt-2 overflow-y-auto">
          @for (item of filteredNavItems(); track item.route) {
            <a 
              [routerLink]="item.route" 
              routerLinkActive="bg-slate-800 text-white border-l-4 border-teal-500"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              (click)="closeMobileMenuOnNav()"
              [title]="isSidebarCollapsed() ? item.label : ''"
              class="flex items-center space-x-3 text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-3 rounded-xl transition-all group relative text-xs font-medium">
              <span class="material-icons text-slate-400 group-hover:text-teal-400 transition-colors text-xl shrink-0">
                {{ item.icon }}
              </span>
              @if (!isSidebarCollapsed()) {
                <span class="truncate flex-1 font-medium">{{ item.label }}</span>
                @if (item.badge && item.badge()) {
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {{ item.badge!() }}
                  </span>
                }
              }
            </a>
          }
        </nav>

        <!-- User Profile Footer -->
        <div class="p-4 border-t border-slate-800">
          <div class="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-xl">
            <div class="relative shrink-0">
              <div class="w-10 h-10 rounded-full border-2 border-slate-700 bg-teal-500/20 flex items-center justify-center text-teal-300 font-bold text-sm">
                {{ (store.currentUser()?.name || 'U').charAt(0) }}
              </div>
              <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-800 rounded-full"></div>
            </div>
            @if (!isSidebarCollapsed()) {
              <div class="overflow-hidden flex-1">
                <p class="text-sm font-bold text-white leading-none truncate">{{ store.currentUser()?.name || 'User' }}</p>
                <p class="text-[11px] text-slate-400 mt-1 uppercase tracking-wider truncate">{{ store.currentUser()?.role }}</p>
              </div>
              <button 
                (click)="logout()" 
                title="Sign Out"
                class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
                <span class="material-icons text-lg">logout</span>
              </button>
            }
          </div>
        </div>

      </aside>

      <!-- MAIN CONTENT WRAPPER -->
      <div [class]="isSidebarCollapsed() ? 'lg:pl-20' : 'lg:pl-64'" class="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        <!-- HEADER BAR -->
        <header class="h-16 border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          
          <div class="flex items-center gap-4">
            <button 
              (click)="toggleMobileMenu()" 
              class="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
              <span class="material-icons">menu</span>
            </button>

            <div class="hidden sm:flex items-center text-sm text-slate-500 space-x-2">
              <span class="font-semibold text-slate-400">HMS</span>
              <span>/</span>
              <span class="text-slate-900 font-semibold font-display">{{ currentRouteTitle() }}</span>
            </div>
          </div>

          <div class="flex items-center space-x-4 sm:space-x-6">
            <!-- Global Search -->
            <div class="relative group hidden sm:block">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text" 
                [value]="store.globalSearchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Search..."
                class="bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-xs w-44 sm:w-56 focus:ring-2 focus:ring-teal-500 transition-all font-medium text-slate-800 placeholder-slate-400"
              />
            </div>

            <!-- Status Indicator -->
            <div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live</span>
            </div>
          </div>

        </header>

        <!-- PAGE BODY -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>

        <!-- FOOTER -->
        <footer class="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white/50">
          HMS Platform & Medical Operations System
        </footer>

      </div>

      <!-- GLOBAL TOAST NOTIFICATIONS -->
      <div class="fixed top-20 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        @for (toast of store.toasts(); track toast.id) {
          <div 
            class="pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-slide-in backdrop-blur-md"
            [class]="getToastClasses(toast.type)">
            <span class="material-icons text-xl shrink-0">{{ getToastIcon(toast.type) }}</span>
            <div class="flex-1">
              <h5 class="text-xs font-bold font-display leading-snug">{{ toast.title }}</h5>
              <p class="text-xs opacity-90 leading-tight mt-0.5">{{ toast.message }}</p>
            </div>
            <button (click)="store.removeToast(toast.id)" class="opacity-60 hover:opacity-100 transition-opacity">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
        }
      </div>

    </div>
  `
})
export class MainLayoutComponent {
  store = inject(StoreService);
  router = inject(Router);

  isSidebarCollapsed = signal(false);
  isMobileMenuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Patients', route: '/patients', icon: 'people_alt', badge: () => this.store.patients().length },
    { label: 'Appointments', route: '/appointments', icon: 'event', badge: () => this.store.appointments().length },
    { label: 'Clinical EHR', route: '/clinical-ehr', icon: 'description', allowedRoles: ['DOCTOR', 'NURSE', 'ADMIN'] },
    { label: 'Pharmacy', route: '/pharmacy', icon: 'medication', badge: () => this.store.pendingPrescriptionsCount(), allowedRoles: ['PHARMACIST', 'DOCTOR', 'ADMIN', 'NURSE'] },
    { label: 'Laboratory', route: '/laboratory', icon: 'biotech', badge: () => this.store.pendingLabOrdersCount(), allowedRoles: ['LAB_TECHNICIAN', 'DOCTOR', 'NURSE', 'ADMIN'] },
    { label: 'Billing', route: '/billing', icon: 'payments', allowedRoles: ['ACCOUNTANT', 'CASHIER', 'ADMIN', 'RECEPTIONIST'] },
    { label: 'Doctor Pricing', route: '/doctor-pricing', icon: 'price_change', allowedRoles: ['ACCOUNTANT', 'ADMIN'] },
    { label: 'Wards & Beds', route: '/wards-beds', icon: 'king_bed', badge: () => `${this.store.bedOccupancyRate()}%`, allowedRoles: ['NURSE', 'DOCTOR', 'ADMIN', 'RECEPTIONIST'] },
    { label: 'Staff Directory', route: '/staff', icon: 'badge', allowedRoles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'HR_MANAGER'] },
    { label: '── Administration ──', route: '', icon: '', allowedRoles: ['ADMIN'] },
    { label: 'Service Operations', route: '/operations', icon: 'settings', allowedRoles: ['ADMIN'] },
    { label: 'Admin Center', route: '/admin', icon: 'admin_panel_settings', allowedRoles: ['ADMIN'] },
    { label: 'Enterprise Desk', route: '/enterprise', icon: 'business', allowedRoles: ['ADMIN'] },
  ];

  filteredNavItems = computed(() => {
    const role = this.store.currentUser()?.role;
    if (!role) return [];
    const roleStr = role as string;
    return this.navItems.filter(item => {
      if (item.label.startsWith('──')) {
        return roleStr === 'ADMIN';
      }
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      return item.allowedRoles.includes(roleStr) || roleStr === 'ADMIN';
    });
  });

  currentRouteTitle = signal('Dashboard');

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      const url = this.router.url;
      const item = this.navItems.find(n => n.route && url.startsWith(n.route));
      this.currentRouteTitle.set(item?.label || 'Dashboard');
    });
  }

  toggleSidebarCollapse() {
    this.isSidebarCollapsed.update(v => !v);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenuOnNav() {
    this.isMobileMenuOpen.set(false);
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.store.globalSearchQuery.set(query);
  }

  logout() {
    this.store.logout();
    this.router.navigate(['/login']);
  }

  getToastClasses(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-900/90 text-emerald-100 border-emerald-700';
      case 'error': return 'bg-rose-900/90 text-rose-100 border-rose-700';
      case 'warning': return 'bg-amber-900/90 text-amber-100 border-amber-700';
      default: return 'bg-slate-900/90 text-slate-100 border-slate-700';
    }
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}