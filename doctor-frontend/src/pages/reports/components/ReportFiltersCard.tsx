import React from 'react';
import { ChevronDown, Download, RefreshCcw, Search, X } from 'lucide-react';

import type {
  DoctorOption,
  ExportFormat,
  FiltersState,
  PatientOption,
  ReportType,
} from '../types';
import { REPORT_TYPE_OPTIONS } from '../utils';

type ReportFiltersCardProps = {
  title: string;
  filters: FiltersState;
  doctors: DoctorOption[];
  rowsPerPage: number;
  loading: boolean;
  canExport: boolean;
  exportingFormat: ExportFormat | null;
  errorMessage: string | null;
  patientSearch: string;
  patientPickerOpen: boolean;
  patientPickerRef: React.RefObject<HTMLDivElement | null>;
  selectedPatientLabel: string;
  selectedPatientOption: PatientOption | null;
  filteredPatientOptions: PatientOption[];
  onPatientSearchChange: (value: string) => void;
  onPatientFieldFocus: () => void;
  onPatientPickerToggle: () => void;
  onClearPatientSearch: () => void;
  onSelectPatient: (patient: PatientOption) => void;
  onRowsPerPageChange: (value: number) => void;
  onReportTypeChange: (reportType: ReportType) => void;
  onDateOrDoctorChange: (key: 'dateFrom' | 'dateTo' | 'doctorId', value: string) => void;
  onExport: (format: ExportFormat) => void;
  onGenerateReport: () => void;
};

const ReportFiltersCard: React.FC<ReportFiltersCardProps> = ({
  title,
  filters,
  doctors,
  rowsPerPage,
  loading,
  canExport,
  exportingFormat,
  errorMessage,
  patientSearch,
  patientPickerOpen,
  patientPickerRef,
  selectedPatientLabel,
  selectedPatientOption,
  filteredPatientOptions,
  onPatientSearchChange,
  onPatientFieldFocus,
  onPatientPickerToggle,
  onClearPatientSearch,
  onSelectPatient,
  onRowsPerPageChange,
  onReportTypeChange,
  onDateOrDoctorChange,
  onExport,
  onGenerateReport,
}) => (
  <div className="overflow-visible rounded-3xl border border-[#dce4e0] bg-[linear-gradient(180deg,rgba(247,251,249,0.96),rgba(255,255,255,0.98))] shadow-[0_20px_45px_rgba(20,46,38,0.08)] sm:rounded-[28px] lg:rounded-[32px]">
    <div className="border-b border-[#e6eeea] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#142e26] sm:text-3xl lg:text-[2.2rem]">{title}</h1>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-wrap lg:justify-end">
          <button
            type="button"
            onClick={() => onExport('sheet')}
            disabled={exportingFormat !== null || loading || !canExport}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-4 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:w-auto sm:px-5"
          >
            <Download className="h-4 w-4" />
            {exportingFormat === 'sheet' ? 'Exporting Sheet...' : 'Export Sheet'}
          </button>
          <button
            type="button"
            onClick={() => onExport('pdf')}
            disabled={exportingFormat !== null || loading || !canExport}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-4 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:w-auto sm:px-5"
          >
            <Download className="h-4 w-4" />
            {exportingFormat === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#159754] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(21,151,84,0.24)] transition hover:bg-[#128549] disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-12 sm:w-auto sm:px-5"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Generate Report
          </button>
        </div>
      </div>
    </div>

    <div className="relative z-30 space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div
        className={`grid gap-4 ${
          filters.reportType === 'patient'
            ? 'sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_1fr_1fr_0.8fr]'
            : 'sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr]'
        }`}
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Report Type</label>
          <select
            value={filters.reportType}
            onChange={(event) => onReportTypeChange(event.target.value as ReportType)}
            className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
          >
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filters.reportType === 'patient' ? (
          <div className="space-y-2" ref={patientPickerRef}>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Patient</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#7a9188]" />
              <input
                value={patientSearch}
                onFocus={onPatientFieldFocus}
                onChange={(event) => onPatientSearchChange(event.target.value)}
                placeholder="Search by name, mobile or ID"
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] pl-10 pr-10 text-sm font-medium text-[#173a31] shadow-sm transition placeholder:text-[#8ca098] focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              />
              <button
                type="button"
                onClick={onPatientPickerToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607d74] transition hover:text-[#173a31]"
              >
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>

              {patientPickerOpen && patientSearch.trim() ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-[24px] border border-[#dce4e0] bg-white p-3 shadow-[0_24px_50px_rgba(20,46,38,0.12)]">
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {filteredPatientOptions.map((option) => (
                      <button
                        key={option.patientId}
                        type="button"
                        onClick={() => onSelectPatient(option)}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-[#f4fbf7]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#173a31]">{option.patientName}</p>
                          <p className="truncate text-xs text-[#607d74]">{option.phone}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#f5faf7] px-2.5 py-1 text-[11px] font-semibold text-[#159754]">
                          {option.patientCode}
                        </span>
                      </button>
                    ))}

                    {filteredPatientOptions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#dce4e0] px-3 py-6 text-center text-sm text-[#607d74]">
                        No patient matches your search.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {filters.patientId && patientSearch === selectedPatientLabel ? (
                <button
                  type="button"
                  onClick={onClearPatientSearch}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[#7a9188] transition hover:text-[#173a31]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              {selectedPatientOption ? <span className="sr-only">{selectedPatientLabel}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onDateOrDoctorChange('dateFrom', event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => onDateOrDoctorChange('dateTo', event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Doctor</label>
          <select
            value={filters.doctorId}
            onChange={(event) => onDateOrDoctorChange('doctorId', event.target.value)}
            disabled={filters.reportType === 'inventory' || filters.reportType === 'stock'}
            className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15 disabled:cursor-not-allowed disabled:bg-[#f3f6f5] disabled:text-[#8ca098]"
          >
            <option value="">All Doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.doctorId} value={doctor.doctorId}>
                {doctor.doctorName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Rows per page</label>
          <select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#f1c1c1] bg-[#fff5f5] px-4 py-3 text-sm text-[#a33b3b]">
          {errorMessage}
        </div>
      ) : null}
    </div>
  </div>
);

export default ReportFiltersCard;
