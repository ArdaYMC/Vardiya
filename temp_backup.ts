import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { Shift, ShiftStatus, ShiftType } from '../../../../core/models/shift.model';
import { UserRole } from '../../../../core/models/user.model';

// FullCalendar imports
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventApi, EventClickArg } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import trLocale from '@fullcalendar/core/locales/tr';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, FullCalendarModule],
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.css']
})
export class ShiftListComponent implements OnInit {
  // Expose enums to template
  ShiftStatus = ShiftStatus;
  ShiftType = ShiftType;
  UserRole = UserRole;

  // Basic state
  filterForm: FormGroup;
  shifts: Shift[] = [];
  isLoading = false;
  isLoadingEmployees = false;
  error: string | null = null;
  totalItems = 0;
  itemsPerPage = 50; // Increased to load more shifts for calendar view
  currentPage = 1;
  totalPages = 1;
  
  // Calendar state
  viewMode: 'calendar' | 'list' = 'calendar';
  calendarEvents: any[] = [];
  calendarOptions: CalendarOptions = {
    plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    initialView: 'dayGridMonth',
    locale: trLocale,
    weekends: true,
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    eventClick: this.handleEventClick.bind(this),
    select: this.handleDateSelect.bind(this),
    events: []
  };

  // Employee assignment state
  selectedShift: Shift | null = null;
  employees: any[] = [];
  filteredEmployees: any[] = [];
  selectedEmployee: any | null = null;
  isAssigning = false;
  showEmployeeSelector = false;
  employeeSearchTerm = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public authService: AuthService
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      shiftType: [''],
      status: [''],
      employeeId: [''],
      location: ['']
    });
  }

  ngOnInit(): void {
    this.loadShifts();
    if (this.hasManagerAccess()) {
      this.loadEmployees();
    }
  }

  loadShifts(): void {
    this.isLoading = true;
    this.error = null;
    this.selectedShift = null;
    this.selectedEmployee = null;

    // Prepare filters
    const filters = this.prepareFilters();
    
    console.log('Vardiyalar yÃ¼kleniyor, filtreler:', filters);

    // API call - we need to handle both direct array responses and object responses
    this.apiService.get<Shift[] | { items: Shift[], total: number }>('shifts', {
      ...filters,
      page: this.currentPage,
      limit: this.itemsPerPage
    }).subscribe({
      next: (response) => {
        console.log('API yanÄ±tÄ±:', response);
        
        // Handle direct array response (API returning shifts array directly)
        if (Array.isArray(response)) {
          this.shifts = response;
          this.totalItems = response.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          console.log('Vardiyalar yÃ¼klendi (dizi):', this.shifts);
          this.updateCalendarEvents();
          this.isLoading = false;
          return;
        }
        
        // Handle object response with items property (paginated response)
        if (response && Array.isArray(response.items)) {
          this.shifts = response.items;
          this.totalItems = response.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          console.log('Vardiyalar yÃ¼klendi (paginated):', this.shifts);
          this.updateCalendarEvents();
          this.isLoading = false;
          return;
        }
        
        // If we get here, the response format is truly invalid
        console.error('Invalid response format:', response);
        this.shifts = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading shifts:', err);
        this.error = 'Vardiyalar yÃ¼klenirken hata oluÅŸtu. LÃ¼tfen daha sonra tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }

  prepareFilters(): any {
    const formValues = this.filterForm.value;
    const filters: any = {};

    if (formValues.startDate) {
      filters.startDate = formValues.startDate;
    }

    if (formValues.endDate) {
      filters.endDate = formValues.endDate;
    }

    if (formValues.shiftType) {
      filters.type = formValues.shiftType;
    }

    if (formValues.status) {
      filters.status = formValues.status;
    }

    if (formValues.location) {
      filters.location = formValues.location;
    }

    if (formValues.employeeId && this.hasManagerAccess()) {
      filters.employeeId = formValues.employeeId;
    }

    return filters;
  }

  applyFilters(): void {
    this.currentPage = 1; // Return to first page when filters are applied
    this.loadShifts();
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: '',
      endDate: '',
      shiftType: '',
      status: '',
      employeeId: '',
      location: ''
    });
    this.currentPage = 1;
    this.loadShifts();
  }

  loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.apiService.get<any[]>('users').subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = [...this.employees];
        this.isLoadingEmployees = false;
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.isLoadingEmployees = false;
      }
    });
  }

  selectShift(shift: Shift): void {
    this.selectedShift = shift;
    if (shift.assignedTo) {
      this.selectedEmployee = this.employees.find(e => e.id === shift.assignedTo) || null;
    } else {
      this.selectedEmployee = null;
    }
  }

  clearSelectedShift(): void {
    this.selectedShift = null;
    this.selectedEmployee = null;
  }

  selectEmployee(employee: any): void {
    this.selectedEmployee = employee;
  }

  filterEmployees(): void {
    const searchTerm = this.employeeSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredEmployees = [...this.employees];
      return;
    }
    this.filteredEmployees = this.employees.filter(employee => {
      return (
        employee.firstName?.toLowerCase().includes(searchTerm) ||
        employee.lastName?.toLowerCase().includes(searchTerm) ||
        employee.email?.toLowerCase().includes(searchTerm) ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm)
      );
    });
  }

  cancelShift(shiftId: number): void {
    if (confirm('Bu vardiyayÄ± iptal etmek istediÄŸinize emin misiniz?')) {
      this.apiService.patch<Shift>(`shifts/${shiftId}/cancel`, {}).subscribe({
        next: (updatedShift) => {
          // Update shift in the list
          const index = this.shifts.findIndex(s => s.id === shiftId);
          if (index !== -1) {
            this.shifts[index] = updatedShift;
          }
          alert('Vardiya baÅŸarÄ±yla iptal edildi.');
        },
        error: (error) => {
          console.error('Vardiya iptal edilirken hata oluÅŸtu:', error);
          alert('Vardiya iptal iÅŸlemi baÅŸarÄ±sÄ±z oldu. LÃ¼tfen daha sonra tekrar deneyin.');
        }
      });
    }
  }

  assignShiftToEmployee(): void {
    if (!this.selectedShift || !this.selectedEmployee) {
      alert('LÃ¼tfen bir vardiya ve Ã§alÄ±ÅŸan seÃ§in.');
      return;
    }
    
    this.isAssigning = true;
    
    console.log(`Vardiya atama isteÄŸi yapÄ±lÄ±yor - Vardiya ID: ${this.selectedShift.id}, Ã‡alÄ±ÅŸan ID: ${this.selectedEmployee.id}`);
    
    // API desteÄŸi flag'leri - backend entegrasyonu tamamlandÄ±
    const backendSupportsAssignEndpoint = true; // PATCH /shifts/:id/assign endpoint'i aktif
    const backendSupportsPutShift = true; // PUT /shifts/:id endpoint'i aktif
    
    if (backendSupportsAssignEndpoint) {
      // DoÄŸrudan atama endpoint'i kullanÄ±mÄ±
      this.apiService.patch(`shifts/${this.selectedShift.id}/assign`, {
        employeeId: this.selectedEmployee.id
      }).subscribe({
        next: (response) => {
          console.log('Vardiya atama baÅŸarÄ±lÄ±:', response);
          this.loadShifts();
          alert(`Vardiya baÅŸarÄ±yla ${this.selectedEmployee?.firstName} ${this.selectedEmployee?.lastName} Ã§alÄ±ÅŸanÄ±na atandÄ±.`);
          this.isAssigning = false;
          this.showEmployeeSelector = false;
        },
        error: (error) => {
          console.error('Vardiya atama hatasÄ±:', error);
          this.updateLocalShift();
          alert('API hatasÄ±: Vardiya atamasÄ± geÃ§ici olarak kaydedildi ancak sayfa yenilendiÄŸinde kaybolabilir.');
          this.isAssigning = false;
          this.showEmployeeSelector = false;
        }
      });
    } else if (backendSupportsPutShift) {
      // PUT isteÄŸi ile vardiya gÃ¼ncelleme
      this.apiService.put(`shifts/${this.selectedShift.id}`, {
        ...this.selectedShift,
        assignedTo: this.selectedEmployee.id
      }).subscribe({
        next: (response) => {
          console.log('Vardiya gÃ¼ncelleme baÅŸarÄ±lÄ±:', response);
          this.loadShifts();
          alert(`Vardiya baÅŸarÄ±yla ${this.selectedEmployee?.firstName} ${this.selectedEmployee?.lastName} Ã§alÄ±ÅŸanÄ±na atandÄ±.`);
          this.isAssigning = false;
          this.showEmployeeSelector = false;
        },
        error: (error) => {
          console.error('Vardiya gÃ¼ncelleme hatasÄ±:', error);
          this.updateLocalShift();
          alert('API hatasÄ±: Vardiya atamasÄ± geÃ§ici olarak kaydedildi ancak sayfa yenilendiÄŸinde kaybolabilir.');
          this.isAssigning = false;
          this.showEmployeeSelector = false;
        }
      });
    } else {
      // Backend API desteÄŸi yok - tamamen yerel mod
      this.updateLocalShift();
      console.log('Vardiya atama baÅŸarÄ±lÄ± (YEREL MOD - API gÃ¼ncellemesi yok)');
      alert(`Vardiya ${this.selectedEmployee?.firstName} ${this.selectedEmployee?.lastName} Ã§alÄ±ÅŸanÄ±na atandÄ±. (Yerel Mod - sayfa yenilendiÄŸinde kaybolabilir)`);
      this.isAssigning = false;
      this.showEmployeeSelector = false;
    }
  }
  
  private updateLocalShift(): void {
    const index = this.shifts.findIndex(s => s.id === this.selectedShift?.id);
    if (index !== -1) {
      const updatedShift = { ...this.shifts[index], assignedTo: this.selectedEmployee?.id };
      this.shifts[index] = updatedShift;
      this.selectedShift = updatedShift;
      this.updateCalendarEvents();
    }
  }

  openEmployeeSelector(shift: Shift): void {
    this.selectShift(shift);
    
    // EÄŸer bu vardiyaya daha Ã¶nce bir Ã§alÄ±ÅŸan atanmÄ±ÅŸsa, onu otomatik olarak seÃ§
    if (shift.assignedTo) {
      console.log('Vardiyaya atanmÄ±ÅŸ Ã§alÄ±ÅŸan bulundu:', shift.assignedTo);
      const assignedEmployee = this.employees.find(e => e.id === shift.assignedTo);
      if (assignedEmployee) {
        console.log('AtanmÄ±ÅŸ Ã§alÄ±ÅŸan seÃ§iliyor:', assignedEmployee.firstName, assignedEmployee.lastName);
        this.selectedEmployee = assignedEmployee;
      }
    } else {
      // AtanmÄ±ÅŸ Ã§alÄ±ÅŸan yoksa seÃ§imi temizle
      this.selectedEmployee = null;
    }
  });
}
}

assignShiftToEmployee(): void {
if (!this.selectedShift || !this.selectedEmployee) {
  alert('LÃ¼tfen bir vardiya ve Ã§alÄ±ÅŸan seÃ§in.');
  return;
}

this.isAssigning = true;
      case UserRole.MANAGER: return 'MÃ¼dÃ¼r';
      case UserRole.EMPLOYEE: return 'Ã‡alÄ±ÅŸan';
      default: return role;
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadShifts();
    }
  }

  pageRange(): number[] {
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  hasManagerAccess(): boolean {
    // YÃ¶netici rolÃ¼ kontrolÃ¼ - ADMIN veya MANAGER rolÃ¼ varsa true dÃ¶ner
    return this.authService.hasRole([UserRole.ADMIN, UserRole.MANAGER]);
  }

  getShiftTypeLabel(type: ShiftType): string {
    switch (type) {
      case ShiftType.REGULAR: return 'Normal';
      case ShiftType.OVERTIME: return 'Mesai';
      case ShiftType.HOLIDAY: return 'Tatil';
      case ShiftType.EMERGENCY: return 'Acil';
      default: return type as string;
    }
  }

  getStatusLabel(status: ShiftStatus): string {
    switch (status) {
      case ShiftStatus.PLANNED: return 'Beklemede';
      case ShiftStatus.ACTIVE: return 'OnaylandÄ±';
      case ShiftStatus.CANCELLED: return 'Ä°ptal Edildi';
      case ShiftStatus.COMPLETED: return 'TamamlandÄ±';
      default: return status as string;
    }
  }

  assignShift(shift: Shift): void {
    this.openEmployeeSelector(shift);
  }

  // Calendar related methods
  updateCalendarEvents(): void {
    if (!this.shifts) {
      this.calendarEvents = [];
      return;
    }
    
    console.log('Takvim olaylarÄ± gÃ¼ncelleniyor, vardiya sayÄ±sÄ±:', this.shifts.length);
    
    this.calendarEvents = this.shifts.map(shift => {
      // Determine color based on shift status
      let backgroundColor = '';
      let borderColor = '';
      
      switch (shift.status) {
        case ShiftStatus.ACTIVE:
          backgroundColor = '#10B981'; // green
          borderColor = '#059669';
          break;
        case ShiftStatus.PLANNED:
          backgroundColor = '#FBBF24'; // yellow
          borderColor = '#D97706';
          break;
        case ShiftStatus.CANCELLED:
          backgroundColor = '#EF4444'; // red
          borderColor = '#B91C1C';
          break;
        case ShiftStatus.COMPLETED:
          backgroundColor = '#3B82F6'; // blue
          borderColor = '#2563EB';
          break;
        default:
          backgroundColor = '#6B7280'; // gray
          borderColor = '#4B5563';
      }
      
      // Add a darker shade if it's an emergency or overtime shift
      if (shift.type === ShiftType.EMERGENCY) {
        backgroundColor = '#DC2626'; // darker red for emergency
        borderColor = '#991B1B';
      } else if (shift.type === ShiftType.OVERTIME) {
        backgroundColor = '#7C3AED'; // purple for overtime
        borderColor = '#5B21B6';
      } else if (shift.type === ShiftType.HOLIDAY) {
        backgroundColor = '#0EA5E9'; // light blue for holiday
        borderColor = '#0284C7';
      }
      
      // Ã‡alÄ±ÅŸan adÄ±nÄ± almaya Ã§alÄ±ÅŸ
      const employeeName = shift.assignedTo ? this.getEmployeeName(shift.assignedTo) : 'AtanmamÄ±ÅŸ';
      
      // Ã‡alÄ±ÅŸan atanmÄ±ÅŸsa veya atanmamÄ±ÅŸsa farklÄ± baÅŸlÄ±klar kullan
      const title = shift.assignedTo ? 
        `ğŸ‘¤ ${employeeName} | ${this.getShiftTypeLabel(shift.type)} | ${shift.location}` : 
        `ğŸ“‹ ${this.getShiftTypeLabel(shift.type)} | ${shift.location} (AtanmamÄ±ÅŸ)`;
      
      // Tarih ve saat bilgisini doÄŸru ÅŸekilde iÅŸle
      let startDate, endDate;
      
      try {
        // API yanÄ±tÄ±nda startTime ve endTime deÄŸerleri ISO formatlÄ± tam tarih-saat olarak geliyorsa doÄŸrudan kullan
        if (shift.startTime && shift.startTime.includes('T') && shift.startTime.includes('Z')) {
          // startTime ve endTime zaten ISO formatÄ±nda tam tarih iÃ§eriyor
          startDate = new Date(shift.startTime);
          endDate = new Date(shift.endTime);
          
          console.log(`Vardiya #${shift.id} iÃ§in ISO formatlÄ± tarihler kullanÄ±lÄ±yor:`, {
            startTime: shift.startTime,
            endTime: shift.endTime,
            startDate: startDate,
            endDate: endDate
          });
        } else if (shift.date) {
          // Geleneksel format - date, startTime ve endTime ayrÄ± ayrÄ±
          startDate = new Date(`${shift.date}T${shift.startTime}`);
          endDate = new Date(`${shift.date}T${shift.endTime}`);
          
          // EÄŸer bitiÅŸ zamanÄ± baÅŸlangÄ±Ã§ zamanÄ±ndan Ã¶nceyse ertesi gÃ¼n olmalÄ±
          if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1);
          }
          
          console.log(`Vardiya #${shift.id} iÃ§in birleÅŸik tarihler kullanÄ±lÄ±yor:`, {
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            startDate: startDate,
            endDate: endDate
          });
        } else {
          // Ne date ne de ISO formatlÄ± startTime var - son Ã§are olarak string kullan
          console.warn(`Vardiya #${shift.id} iÃ§in tarih bilgisi eksik:`, shift);
          startDate = shift.startTime;
          endDate = shift.endTime;
        }
      } catch (error) {
        console.error(`Tarih oluÅŸturma hatasÄ±, vardiya #${shift.id}:`, error, {
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime
        });
        
        // Hata durumunda doÄŸrudan ham deÄŸerleri kullan
        startDate = shift.startTime;
        endDate = shift.endTime;
      }
      
      return {
        id: shift.id.toString(),
        title: title,
        start: startDate,
        end: endDate,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        extendedProps: {
          shift: shift
        }
      };
    });
    
    // Update calendar options with new events
    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents
    };
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const shiftId = Number(clickInfo.event.id);
    const shift = this.shifts.find(s => s.id === shiftId);
    
    if (shift) {
      this.selectShift(shift);
    }
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    // Only proceed if user has manager access
    if (!this.hasManagerAccess()) return;
    
    const date = new Date(selectInfo.startStr);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Navigate to create shift page with pre-filled date
    window.location.href = `/shifts/create?date=${formattedDate}`;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'calendar' ? 'list' : 'calendar';
  }
}
