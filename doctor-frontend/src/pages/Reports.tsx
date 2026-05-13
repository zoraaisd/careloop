import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import api from '@/services/api';

type ReportType = 'patient' | 'revenue' | 'inventory' | 'expenses';

type DoctorOption = {
  doctorId: string;
  doctorName: string;
};

type ReportMetric = {
  label: string;
  value: string;
  helperText?: string;
};

type ReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  kind?: 'text' | 'status' | 'currency';
};

type ReportRow = Record<string, string | number | null>;

type ReportViewResponse = {
  filters: {
    reportType: ReportType;
    dateFrom: string;
    dateTo: string;
    doctorId: string | null;
  };
  title: string;
  doctors: DoctorOption[];
  metrics: ReportMetric[];
  columns: ReportColumn[];
  rows: ReportRow[];
  exportFileName: string;
};

type FiltersState = {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  doctorId: string;
};

type ExportFormat = 'sheet' | 'pdf';

const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: 'patient', label: 'Patient Report' },
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'expenses', label: 'Expenses Report' },
];

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDefaultFilters = (): FiltersState => {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 6);

  return {
    reportType: 'patient',
    dateFrom: getDateKey(from),
    dateTo: getDateKey(today),
    doctorId: '',
  };
};

const emptyReport: ReportViewResponse = {
  filters: {
    reportType: 'patient',
    dateFrom: '',
    dateTo: '',
    doctorId: null,
  },
  title: 'Patient Report',
  doctors: [],
  metrics: [],
  columns: [],
  rows: [],
  exportFileName: 'report.csv',
};

const getStatusPill = (value: string | number | null) => {
  const normalized = String(value ?? '').toLowerCase();

  if (normalized.includes('paid') || normalized.includes('active') || normalized.includes('verified') || normalized.includes('stock')) {
    return 'bg-[#e9f8ef] text-[#17844b]';
  }

  if (normalized.includes('pending') || normalized.includes('low')) {
    return 'bg-[#fff4e8] text-[#d97318]';
  }

  if (normalized.includes('out') || normalized.includes('cancel')) {
    return 'bg-[#fff1f1] text-[#ca3f3f]';
  }

  return 'bg-[#eef3f1] text-[#607d74]';
};

const getCellAlignment = (align?: ReportColumn['align']) => {
  if (align === 'right') {
    return 'text-right';
  }

  if (align === 'center') {
    return 'text-center';
  }

  return 'text-left';
};

const PATIENT_REPORT_COLUMN_KEYS = [
  'patientId',
  'patientName',
  'ageGender',
  'doctorName',
  'phone',
  'registeredDate',
  'totalVisits',
  'status',
] as const;

const formatDisplayId = (prefix: string, index: number) => `${prefix}${String(index + 1).padStart(3, '0')}`;

const isFormattedReportId = (value: string, prefix: string) =>
  new RegExp(`^${prefix}\\d{3}$`, 'i').test(value.trim());

const withDisplayIds = (report: ReportViewResponse, reportType: ReportType): ReportViewResponse => {
  const idKeyByType: Record<ReportType, { key: string; prefix: string }> = {
    patient: { key: 'patientId', prefix: 'PAD' },
    revenue: { key: 'invoiceId', prefix: 'INV' },
    inventory: { key: 'itemId', prefix: 'ITM' },
    expenses: { key: 'expenseId', prefix: 'EXP' },
  };

  const config = idKeyByType[reportType];

  return {
    ...report,
    rows: report.rows.map((row, index) => ({
      ...row,
      [config.key]:
        typeof row[config.key] === 'string' && isFormattedReportId(row[config.key] as string, config.prefix)
          ? row[config.key]
          : formatDisplayId(config.prefix, index),
    })),
  };
};

const withSupplierColumn = (report: ReportViewResponse, reportType: ReportType): ReportViewResponse => {
  if (reportType === 'patient') {
    return {
      ...report,
      columns: report.columns.filter((column) =>
        PATIENT_REPORT_COLUMN_KEYS.includes(column.key as (typeof PATIENT_REPORT_COLUMN_KEYS)[number]),
      ),
    };
  }

  const hasSupplierColumn = report.columns.some((column) => column.key === 'supplier');
  if (hasSupplierColumn) {
    return report;
  }

  const nextColumns = [...report.columns];
  let insertIndex = nextColumns.length;

  if (reportType === 'inventory') {
    const itemNameIndex = nextColumns.findIndex((column) => column.key === 'itemName');
    const categoryIndex = nextColumns.findIndex((column) => column.key === 'category');
    insertIndex = itemNameIndex >= 0 ? itemNameIndex + 1 : categoryIndex >= 0 ? categoryIndex : nextColumns.length;
  } else if (reportType === 'revenue') {
    const doctorIndex = nextColumns.findIndex((column) => column.key === 'doctorName');
    insertIndex = doctorIndex >= 0 ? doctorIndex + 1 : nextColumns.length;
  } else if (reportType === 'expenses') {
    const dateIndex = nextColumns.findIndex((column) => column.key === 'date');
    const categoryIndex = nextColumns.findIndex((column) => column.key === 'category');
    insertIndex = dateIndex >= 0 ? dateIndex + 1 : categoryIndex >= 0 ? categoryIndex : nextColumns.length;
  }

  nextColumns.splice(insertIndex, 0, {
    key: 'supplier',
    label: 'Supplier',
  });

  return {
    ...report,
    columns: nextColumns,
    rows: report.rows.map((row) => ({
      ...row,
      supplier: row.supplier ?? '--',
    })),
  };
};

const withoutHiddenMetrics = (report: ReportViewResponse): ReportViewResponse => ({
  ...report,
  metrics: report.metrics.filter((metric) => metric.label !== 'Filtered Total Amount'),
});

const getExportFileName = (baseFileName: string, format: ExportFormat) => {
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  return baseFileName.replace(/\.[^.]+$/, `.${extension}`);
};

const Reports: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>(createDefaultFilters);
  const [report, setReport] = useState<ReportViewResponse>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('reportType', filters.reportType);
    params.set('dateFrom', filters.dateFrom);
    params.set('dateTo', filters.dateTo);

    if (filters.doctorId && filters.reportType !== 'inventory') {
      params.set('doctorId', filters.doctorId);
    }

    return params.toString();
  };

  const loadReport = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<ReportViewResponse>(`/doctor/reports/view?${buildQuery()}`);
      setReport(response.data ?? emptyReport);
    } catch (error) {
      console.error('Failed to load report', error);
      setReport(emptyReport);
      setErrorMessage('Unable to load report data right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [filters.reportType, filters.dateFrom, filters.dateTo, filters.doctorId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.reportType, filters.dateFrom, filters.dateTo, filters.doctorId, rowsPerPage]);

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);

    try {
      const response = await api.get(`/doctor/reports/export?${buildQuery()}&format=${format}`, {
        responseType: 'arraybuffer',
      });
      const fallbackContentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const contentTypeHeader = response.headers['content-type'];
      const contentType =
        typeof contentTypeHeader === 'string' ? contentTypeHeader : fallbackContentType;
      const binaryData = response.data instanceof ArrayBuffer ? response.data : new ArrayBuffer(0);

      if (format === 'pdf') {
        const pdfSignature = new TextDecoder('ascii').decode(binaryData.slice(0, 5));

        if (pdfSignature !== '%PDF-') {
          const serverMessage = new TextDecoder().decode(binaryData).slice(0, 200);
          throw new Error(serverMessage || 'The server did not return a valid PDF file.');
        }
      }

      const blob = new Blob([binaryData], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const fallbackFileName = getExportFileName(report.exportFileName, format);
      const fileName =
        typeof response.headers['content-disposition'] === 'string'
          ? response.headers['content-disposition']
              .split('filename=')[1]
              ?.replace(/"/g, '') ?? fallbackFileName
          : fallbackFileName;

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report', error);
      if (axios.isAxiosError(error) && error.response?.data instanceof ArrayBuffer) {
        try {
          const rawMessage = new TextDecoder().decode(error.response.data);
          const parsed = JSON.parse(rawMessage) as { message?: string; debug?: { message?: string } };
          setErrorMessage(parsed.message || parsed.debug?.message || 'Export failed. Please try again.');
        } catch {
          setErrorMessage('Export failed. Please try again.');
        }
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Export failed. Please try again.');
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(report.rows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const displayReport = useMemo(() => {
    const reportWithDisplayIds = withDisplayIds(report, filters.reportType);
    const reportWithVisibleMetrics = withoutHiddenMetrics(reportWithDisplayIds);
    return withSupplierColumn(reportWithVisibleMetrics, filters.reportType);
  }, [report, filters.reportType]);
  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage;
    return displayReport.rows.slice(startIndex, startIndex + rowsPerPage);
  }, [displayReport.rows, rowsPerPage, safePage]);

  const showingFrom = displayReport.rows.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const showingTo = Math.min(safePage * rowsPerPage, displayReport.rows.length);

  return (
    <div className="space-y-6 pb-10 sm:space-y-8 sm:pb-12">
      <div className="overflow-hidden rounded-[24px] border border-[#dce4e0] bg-[linear-gradient(180deg,rgba(247,251,249,0.96),rgba(255,255,255,0.98))] shadow-[0_20px_45px_rgba(20,46,38,0.08)] sm:rounded-[28px] lg:rounded-[32px]">
        <div className="border-b border-[#e6eeea] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold tracking-tight text-[#142e26] sm:text-3xl lg:text-[2.2rem]">{displayReport.title}</h1>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => void handleExport('sheet')}
                disabled={exportingFormat !== null || loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-5 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {exportingFormat === 'sheet' ? 'Exporting Sheet...' : 'Export Sheet'}
              </button>
              <button
                type="button"
                onClick={() => void handleExport('pdf')}
                disabled={exportingFormat !== null || loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-5 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {exportingFormat === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={() => void loadReport()}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#159754] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(21,151,84,0.24)] transition hover:bg-[#128549] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Generate Report
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr]">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Report Type</label>
              <select
                value={filters.reportType}
                onChange={(event) =>
                  setFilters((current) => {
                    const nextReportType = event.target.value as ReportType;

                    return {
                      ...current,
                      reportType: nextReportType,
                      doctorId: nextReportType === 'inventory' ? '' : current.doctorId,
                    };
                  })
                }
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              >
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Doctor</label>
              <select
                value={filters.doctorId}
                onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))}
                disabled={filters.reportType === 'inventory'}
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15 disabled:cursor-not-allowed disabled:bg-[#f3f6f5] disabled:text-[#8ca098]"
              >
                <option value="">All Doctors</option>
                {report.doctors.map((doctor) => (
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
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {displayReport.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[22px] border border-[#dce4e0] bg-white p-4 shadow-[0_18px_35px_rgba(20,46,38,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(20,46,38,0.08)] sm:rounded-[24px] sm:p-5 lg:rounded-[26px]"
          >
            <p className="text-sm font-medium text-[#607d74]">{metric.label}</p>
            <p className="mt-4 text-[28px] font-bold leading-none tracking-tight text-[#142e26] sm:text-[30px]">{loading ? '--' : metric.value}</p>
            {metric.helperText ? <p className="mt-3 text-sm leading-6 text-[#607d74]">{metric.helperText}</p> : null}
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[24px] border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
        <div className="flex flex-col gap-4 border-b border-[#edf2ef] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div>
            <h2 className="text-xl font-bold text-[#142e26]">{displayReport.title} Details</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-[#f5faf7] px-4 py-2 text-sm font-medium text-[#54756a]">
              {displayReport.rows.length.toLocaleString('en-IN')} entries
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-6 lg:hidden">
          {paginatedRows.map((row, rowIndex) => (
            <article
              key={`${displayReport.title}-mobile-${rowIndex}`}
              className="rounded-[22px] border border-[#e3ece7] bg-[#fbfdfc] p-4 shadow-[0_10px_24px_rgba(20,46,38,0.04)]"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {displayReport.columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <div key={column.key} className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f867d]">{column.label}</p>
                      <div className={`text-sm font-medium text-[#173a31] ${getCellAlignment(column.align)}`}>
                        {column.kind === 'status' ? (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(value ?? '')}`}>
                            {String(value ?? '--')}
                          </span>
                        ) : (
                          String(value ?? '--')
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
          {!loading && paginatedRows.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#dce4e0] px-4 py-10 text-center text-sm text-[#607d74]">
              No report rows found for the selected filters.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto px-3 py-3 lg:block">
          <table className="min-w-[960px] text-sm xl:min-w-[1080px]">
            <thead>
              <tr className="border-b border-[#edf2ef] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">
                {displayReport.columns.map((column) => (
                  <th
                    key={column.key}
                    className={`bg-[#f8fbf9] px-5 py-4 ${getCellAlignment(column.align)}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rowIndex) => (
                <tr
                  key={`${displayReport.title}-${rowIndex}`}
                  className="border-b border-[#f1f5f3] text-[#173a31] transition odd:bg-white even:bg-[#fcfefd] hover:bg-[#f6fbf8] last:border-b-0"
                >
                  {displayReport.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td
                        key={column.key}
                        className={`px-5 py-4 align-middle ${getCellAlignment(column.align)}`}
                      >
                        {column.kind === 'status' ? (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(value ?? '')}`}>
                            {String(value ?? '--')}
                          </span>
                        ) : (
                          String(value ?? '--')
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!loading && paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(displayReport.columns.length, 1)} className="px-5 py-14 text-center text-sm text-[#607d74]">
                    No report rows found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#edf2ef] px-4 py-5 text-sm text-[#607d74] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <p className="text-center sm:text-left">
            Showing {showingFrom} to {showingTo} of {displayReport.rows.length.toLocaleString('en-IN')} entries
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="min-h-10 rounded-xl border border-[#dce4e0] px-4 py-2 font-medium text-[#173a31] transition hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <div className="flex items-center justify-center gap-2">
              <div className="rounded-xl bg-[#159754] px-4 py-2 font-semibold text-white">{safePage}</div>
              <div className="text-[#7a9188]">/ {totalPages}</div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="min-h-10 rounded-xl border border-[#dce4e0] px-4 py-2 font-medium text-[#173a31] transition hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
