import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Lead, LeadStats, LeadService } from '../../services/lead.service';
import { LeadDialogComponent, LeadDialogData } from './lead-dialog.component';
import { LeadInteractionsComponent, InteractionDialogData } from './lead-interactions.component';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.scss'],
})
export class LeadsComponent implements OnInit {
  i18n = inject(I18nService);

  leads: Lead[] = [];
  loading = true;
  dataSource = new MatTableDataSource<Lead>([]);
  displayedColumns = ['name', 'email', 'phone', 'source', 'funnel_status', 'tags', 'value', 'actions'];

  stats: LeadStats = { novo: 0, contatado: 0, interessado: 0, convertido: 0, perdido: 0, total: 0 };

  searchTerm = '';
  activeStatusFilter = '';
  tagFilter = '';
  pageSize = 20;
  currentPage = 1;

  private searchTimeout: any;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private leadService: LeadService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadLeads();
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  loadStats(): void {
    this.leadService.getStats().subscribe({
      next: (stats) => this.stats = stats,
    });
  }

  loadLeads(): void {
    this.loading = true;
    this.leadService.getAll({
      status: this.activeStatusFilter || undefined,
      tag: this.tagFilter || undefined,
      search: this.searchTerm || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    }).subscribe({
      next: (leads) => {
        this.leads = leads;
        this.dataSource.data = leads;
        this.loading = false;
      },
      error: () => {
        this.leads = [];
        this.dataSource.data = [];
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadLeads();
    }, 400);
  }

  filterByStatus(status: string): void {
    if (this.activeStatusFilter === status) {
      this.activeStatusFilter = '';
    } else {
      this.activeStatusFilter = status;
    }
    this.currentPage = 1;
    this.loadLeads();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadLeads();
  }

  openLeadDialog(lead?: Lead): void {
    const dialogData: LeadDialogData = { lead };
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '500px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      if (lead) {
        this.leadService.update(lead.id, result).subscribe({
          next: () => { this.loadLeads(); this.loadStats(); },
        });
      } else {
        this.leadService.create(result).subscribe({
          next: () => { this.loadLeads(); this.loadStats(); },
        });
      }
    });
  }

  openInteractions(lead: Lead): void {
    const dialogData: InteractionDialogData = { lead };
    const dialogRef = this.dialog.open(LeadInteractionsComponent, {
      width: '550px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((statusChanged) => {
      if (statusChanged) {
        this.loadLeads();
        this.loadStats();
      }
    });
  }

  confirmDelete(lead: Lead): void {
    const confirmed = window.confirm(`${this.i18n.t('leads.confirmDelete')} "${lead.name}"?`);
    if (confirmed) {
      this.leadService.delete(lead.id).subscribe({
        next: () => { this.loadLeads(); this.loadStats(); },
      });
    }
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.leadService.importCsv(file).subscribe({
      next: (result) => {
        alert(`${this.i18n.t('leads.importedCount')}: ${result.imported} ${this.i18n.t('leads.importedLeads')}.${result.errors.length > 0 ? '\n' + this.i18n.t('leads.importErrors') + ': ' + result.errors.join(', ') : ''}`);
        this.loadLeads();
        this.loadStats();
        input.value = '';
      },
      error: () => {
        alert(this.i18n.t('leads.importError'));
        input.value = '';
      },
    });
  }

  formatPrice(value: number): string {
    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getSourceLabel(source: string | null): string {
    const map: Record<string, string> = {
      manual: 'Manual',
      meta_ads: 'Meta Ads',
      whatsapp: 'WhatsApp',
      landing_page: 'Landing Page',
      csv_import: 'CSV',
    };
    return source ? (map[source] || source) : '-';
  }

  getStatusLabel(status: string | null): string {
    const map: Record<string, string> = {
      novo: this.i18n.t('leads.novo'),
      contatado: this.i18n.t('leads.contatado'),
      interessado: this.i18n.t('leads.interessado'),
      convertido: this.i18n.t('leads.convertido'),
      perdido: this.i18n.t('leads.perdido'),
    };
    return status ? (map[status] || status) : '-';
  }

  getTagsList(tags: string | null): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }
}
