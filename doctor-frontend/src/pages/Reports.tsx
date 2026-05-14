import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  RefreshCcw,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import axios from 'axios';
import api from '@/services/api';

type ReportType = 'patient' | 'revenue' | 'inventory' | 'expenses';

type DoctorOption = {
  doctorId: string;
  doctorName: string;
};

type PatientOption = {
  patientId: string;
  patientCode: string;
  patientName: string;
  phone: string;
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

type PatientHistory = {
  basicDetails: {
    patientId: string;
    patientCode: string;
    patientName: string;
    age: number;
    gender: string | null;
    phone: string;
    email: string | null;
    bloodGroup: string | null;
    verificationStatus: string;
    assignedDoctor: string;
    registrationDate: string;
    totalVisits: number;
  };
  medicalHistory: {
    allergies: string | null;
    chronicDiseases: string | null;
    pastSurgeries: string | null;
    previousTreatments: string | null;
    additionalNotes: string | null;
    weight: string | null;
    height: string | null;
    bp: string | null;
    sugar: string | null;
    healthProblem: string | null;
  };
  appointmentHistory: Array<{
    appointmentId: string;
    date: string;
    time: string;
    doctorName: string;
    appointmentType: string;
    status: string;
    billingAmount: string;
    notes: string | null;
  }>;
  prescriptionHistory: Array<{
    prescriptionId: string;
    date: string;
    doctorName: string;
    diagnosis: string;
    notes: string | null;
    medicines: string[];
  }>;
  uploadedReports: Array<{
    documentId: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  doctorNotes: Array<{
    source: string;
    date: string;
    note: string;
  }>;
};

type ReportViewResponse = {
  filters: {
    reportType: ReportType;
    dateFrom: string;
    dateTo: string;
    doctorId: string | null;
    patientId?: string | null;
  };
  title: string;
  doctors: DoctorOption[];
  patientOptions?: PatientOption[];
  metrics: ReportMetric[];
  columns: ReportColumn[];
  rows: ReportRow[];
  selectedPatientHistory?: PatientHistory | null;
  exportFileName: string;
};

type FiltersState = {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  doctorId: string;
  patientId: string;
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
    patientId: '',
  };
};

const emptyReport: ReportViewResponse = {
  filters: {
    reportType: 'patient',
    dateFrom: '',
    dateTo: '',
    doctorId: null,
    patientId: null,
  },
  title: 'Patient Report',
  doctors: [],
  patientOptions: [],
  metrics: [],
  columns: [],
  rows: [],
  selectedPatientHistory: null,
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

const normalizeSearchValue = (value: string | number | null | undefined) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const formatDateTime = (value: string) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(date);
};

const historySections = (history: PatientHistory) => [
  {
    title: 'Appointment History',
    count: history.appointmentHistory.length,
    icon: <Stethoscope className="h-4 w-4 text-[#159754]" />,
  },
  {
    title: 'Prescription History',
    count: history.prescriptionHistory.length,
    icon: <FileText className="h-4 w-4 text-[#159754]" />,
  },
  {
    title: 'Uploaded Reports',
    count: history.uploadedReports.length,
    icon: <FileText className="h-4 w-4 text-[#159754]" />,
  },
  {
    title: 'Doctor Notes',
    count: history.doctorNotes.length,
    icon: <FileText className="h-4 w-4 text-[#159754]" />,
  },
];

const Reports: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(createDefaultFilters);
  const [report, setReport] = useState<ReportViewResponse>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const patientPickerRef = useRef<HTMLDivElement | null>(null);

  const buildQuery = (queryFilters: FiltersState) => {
    const params = new URLSearchParams();
    params.set('reportType', queryFilters.reportType);
    params.set('dateFrom', queryFilters.dateFrom);
    params.set('dateTo', queryFilters.dateTo);

    if (queryFilters.doctorId && queryFilters.reportType !== 'inventory') {
      params.set('doctorId', queryFilters.doctorId);
    }

    if (queryFilters.reportType === 'patient' && queryFilters.patientId) {
      params.set('patientId', queryFilters.patientId);
    }

    return params.toString();
  };

  const loadReport = async (queryFilters: FiltersState) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<ReportViewResponse>(`/doctor/reports/view?${buildQuery(queryFilters)}`);
      const nextReport = response.data ?? emptyReport;
      setReport(nextReport);
      setAppliedFilters(queryFilters);

      if (queryFilters.reportType === 'patient' && nextReport.selectedPatientHistory) {
        setPatientHistory(nextReport.selectedPatientHistory);
        setHistoryError(null);
      } else {
        setPatientHistory(null);
        setHistoryError(null);
      }
    } catch (error) {
      console.error('Failed to load report', error);
      setReport(emptyReport);
      setErrorMessage('Unable to load report data right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientHistory = async (patientId: string) => {
    const nextFilters: FiltersState = {
      ...appliedFilters,
      reportType: 'patient',
      patientId,
    };

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await api.get<ReportViewResponse>(`/doctor/reports/view?${buildQuery(nextFilters)}`);
      setPatientHistory(response.data?.selectedPatientHistory ?? null);
      if (!response.data?.selectedPatientHistory) {
        setHistoryError('No patient history found for the selected patient.');
      }
    } catch (error) {
      console.error('Failed to load patient history', error);
      setHistoryError('Unable to load patient history right now. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadReport(createDefaultFilters());
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, rowsPerPage]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (patientPickerRef.current && !patientPickerRef.current.contains(event.target as Node)) {
        setPatientPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);

    try {
      const response = await api.get(`/doctor/reports/export?${buildQuery(appliedFilters)}&format=${format}`, {
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

  const handleGenerateReport = async () => {
    if (filters.reportType === 'patient') {
      await loadReport(filters);
      return;
    }

    await loadReport(filters);
  };

  const handleReportTypeChange = async (nextReportType: ReportType) => {
    const nextFilters: FiltersState = {
      ...filters,
      reportType: nextReportType,
      doctorId: nextReportType === 'inventory' ? '' : filters.doctorId,
      patientId: nextReportType === 'patient' ? filters.patientId : '',
    };

    setFilters(nextFilters);
    setErrorMessage(null);
    setHistoryError(null);
    setPatientHistory(null);
    setPatientSearch('');
    setPatientPickerOpen(false);

    await loadReport(nextFilters);
  };

  const handleDateOrDoctorChange = async (key: 'dateFrom' | 'dateTo' | 'doctorId', value: string) => {
    const nextFilters: FiltersState = {
      ...filters,
      [key]: value,
      ...(key === 'doctorId' ? { patientId: '' } : {}),
    };

    setFilters(nextFilters);

    if (nextFilters.reportType !== 'patient') {
      await loadReport(nextFilters);
      return;
    }

    if (key === 'doctorId') {
      setPatientSearch('');
      setPatientPickerOpen(false);
      setPatientHistory(null);
      setHistoryError(null);
    }
  };

  const displayReport = useMemo(() => {
    const reportWithDisplayIds = withDisplayIds(report, appliedFilters.reportType);
    const reportWithVisibleMetrics = withoutHiddenMetrics(reportWithDisplayIds);
    return withSupplierColumn(reportWithVisibleMetrics, appliedFilters.reportType);
  }, [report, appliedFilters.reportType]);

  const patientOptions = useMemo(() => {
    const optionsFromApi = displayReport.patientOptions ?? [];
    const optionsFromRows =
      appliedFilters.reportType === 'patient'
        ? displayReport.rows
            .map((row) => {
              const internalPatientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
              const patientCode = typeof row.patientId === 'string' ? row.patientId : '';
              const patientName = typeof row.patientName === 'string' ? row.patientName : '';
              const phone = typeof row.phone === 'string' ? row.phone : '';

              if (!internalPatientId || !patientName) {
                return null;
              }

              return {
                patientId: internalPatientId,
                patientCode,
                patientName,
                phone,
              };
            })
            .filter((option): option is PatientOption => option !== null)
        : [];

    const mergedOptions = [...optionsFromApi, ...optionsFromRows];
    const deduped = new Map<string, PatientOption>();

    mergedOptions.forEach((option) => {
      if (!deduped.has(option.patientId)) {
        deduped.set(option.patientId, option);
      }
    });

    return Array.from(deduped.values());
  }, [appliedFilters.reportType, displayReport.patientOptions, displayReport.rows]);

  const selectedPatientOption = patientOptions.find((option) => option.patientId === filters.patientId) ?? null;
  const selectedPatientLabel = selectedPatientOption
    ? `${selectedPatientOption.patientName} | ${selectedPatientOption.phone} | ${selectedPatientOption.patientCode}`
    : '';
  const filteredPatientOptions = useMemo(() => {
    const query = normalizeSearchValue(patientSearch.trim());

    if (!query) {
      return patientOptions;
    }

    return patientOptions.filter((option) =>
      [option.patientName, option.phone, option.patientCode].some((value) =>
        normalizeSearchValue(value).includes(query),
      ),
    );
  }, [patientOptions, patientSearch]);

  const totalPages = Math.max(1, Math.ceil(displayReport.rows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage;
    return displayReport.rows.slice(startIndex, startIndex + rowsPerPage);
  }, [displayReport.rows, rowsPerPage, safePage]);

  const activePatientHistory =
    appliedFilters.reportType === 'patient' && appliedFilters.patientId && displayReport.selectedPatientHistory
      ? displayReport.selectedPatientHistory
      : patientHistory;
  const showingFrom = displayReport.rows.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const showingTo = Math.min(safePage * rowsPerPage, displayReport.rows.length);
  const showPatientLayout = Boolean(appliedFilters.reportType === 'patient' && activePatientHistory);

  useEffect(() => {
    if (!patientPickerOpen && filters.patientId && selectedPatientLabel) {
      setPatientSearch(selectedPatientLabel);
    }
  }, [filters.patientId, patientPickerOpen, selectedPatientLabel]);

  return (
    <div className="space-y-5 pb-8 sm:space-y-8 sm:pb-12">
      <div className="overflow-visible rounded-3xl border border-[#dce4e0] bg-[linear-gradient(180deg,rgba(247,251,249,0.96),rgba(255,255,255,0.98))] shadow-[0_20px_45px_rgba(20,46,38,0.08)] sm:rounded-[28px] lg:rounded-[32px]">
        <div className="border-b border-[#e6eeea] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#142e26] sm:text-3xl lg:text-[2.2rem]">{displayReport.title}</h1>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => void handleExport('sheet')}
                disabled={exportingFormat !== null || loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-4 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:w-auto sm:px-5"
              >
                <Download className="h-4 w-4" />
                {exportingFormat === 'sheet' ? 'Exporting Sheet...' : 'Export Sheet'}
              </button>
              <button
                type="button"
                onClick={() => void handleExport('pdf')}
                disabled={exportingFormat !== null || loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#1faa62]/30 bg-white px-4 py-3 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:w-auto sm:px-5"
              >
                <Download className="h-4 w-4" />
                {exportingFormat === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateReport()}
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
                onChange={(event) => void handleReportTypeChange(event.target.value as ReportType)}
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
                    onFocus={() => {
                      setPatientPickerOpen(true);
                      if (filters.patientId && patientSearch === selectedPatientLabel) {
                        setPatientSearch('');
                      }
                    }}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setPatientSearch(nextValue);
                      setPatientPickerOpen(true);

                      if (filters.patientId) {
                        setFilters((current) => ({ ...current, patientId: '' }));
                      }
                    }}
                    placeholder="Search by name, mobile or ID"
                    className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] pl-10 pr-10 text-sm font-medium text-[#173a31] shadow-sm transition placeholder:text-[#8ca098] focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setPatientPickerOpen((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607d74] transition hover:text-[#173a31]"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </button>

                  {patientPickerOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-[24px] border border-[#dce4e0] bg-white p-3 shadow-[0_24px_50px_rgba(20,46,38,0.12)]">
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {!patientSearch.trim() ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFilters((current) => ({ ...current, patientId: '' }));
                              setPatientSearch('');
                              setPatientPickerOpen(false);
                              setPatientHistory(null);
                              setHistoryError(null);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-[#173a31] transition hover:bg-[#f4fbf7]"
                          >
                            <span>All Patients</span>
                            {!filters.patientId ? <span className="text-xs font-semibold text-[#159754]">Selected</span> : null}
                          </button>
                        ) : null}

                        {filteredPatientOptions.map((option) => (
                          <button
                            key={option.patientId}
                            type="button"
                            onClick={() => {
                              setFilters((current) => ({ ...current, patientId: option.patientId }));
                              setPatientSearch(`${option.patientName} | ${option.phone} | ${option.patientCode}`);
                              setPatientPickerOpen(false);
                              setPatientHistory(null);
                              setHistoryError(null);
                            }}
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
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => void handleDateOrDoctorChange('dateFrom', event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => void handleDateOrDoctorChange('dateTo', event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[#dce4e0] bg-[#fbfdfc] px-4 py-3 text-sm font-medium text-[#173a31] shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/15"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Doctor</label>
              <select
                value={filters.doctorId}
                onChange={(event) => void handleDateOrDoctorChange('doctorId', event.target.value)}
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
            className="rounded-[22px] border border-[#dce4e0] bg-white p-4 shadow-[0_18px_35px_rgba(20,46,38,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(20,46,38,0.08)] sm:rounded-3xl sm:p-5 lg:rounded-[26px]"
          >
            <p className="text-sm font-medium text-[#607d74]">{metric.label}</p>
            <p className="mt-3 break-words text-[24px] font-bold leading-tight tracking-tight text-[#142e26] sm:mt-4 sm:text-[30px]">{loading ? '--' : metric.value}</p>
            {metric.helperText ? <p className="mt-3 text-sm leading-6 text-[#607d74]">{metric.helperText}</p> : null}
          </div>
        ))}
      </div>

      <div className={showPatientLayout ? 'grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_380px]' : 'block'}>
        <section className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
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
                <div className="grid gap-3">
                  {displayReport.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <div key={column.key} className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f867d]">{column.label}</p>
                        <div className={`break-words text-sm font-medium text-[#173a31] ${column.kind === 'status' ? 'text-left' : ''}`}>
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

                  {appliedFilters.reportType === 'patient' ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                          if (patientId) {
                            void loadPatientHistory(patientId);
                          }
                        }}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-4 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7]"
                      >
                        <Eye className="h-4 w-4" />
                        View History
                      </button>
                    </div>
                  ) : null}
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
                  {appliedFilters.reportType === 'patient' ? <th className="bg-[#f8fbf9] px-5 py-4 text-center">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rowIndex) => (
                  <tr
                    key={`${displayReport.title}-${rowIndex}`}
                    className={`border-b border-[#f1f5f3] text-[#173a31] transition odd:bg-white even:bg-[#fcfefd] hover:bg-[#f6fbf8] last:border-b-0 ${
                      appliedFilters.reportType === 'patient' ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (appliedFilters.reportType !== 'patient') {
                        return;
                      }

                      const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                      if (patientId) {
                        void loadPatientHistory(patientId);
                      }
                    }}
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
                    {appliedFilters.reportType === 'patient' ? (
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                            if (patientId) {
                              void loadPatientHistory(patientId);
                            }
                          }}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-4 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7]"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {!loading && paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(displayReport.columns.length + (appliedFilters.reportType === 'patient' ? 1 : 0), 1)} className="px-5 py-14 text-center text-sm text-[#607d74]">
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

        {showPatientLayout ? (
          <aside className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
            <div className="flex items-center justify-between border-b border-[#edf2ef] px-5 py-5">
              <h2 className="text-xl font-bold text-[#142e26]">Patient History</h2>
              {!displayReport.selectedPatientHistory ? (
                <button
                  type="button"
                  onClick={() => {
                    setPatientHistory(null);
                    setHistoryError(null);
                  }}
                  className="rounded-full p-2 text-[#607d74] transition hover:bg-[#f4fbf7] hover:text-[#173a31]"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            {historyLoading ? (
              <div className="px-5 py-8 text-sm text-[#607d74]">Loading patient history...</div>
            ) : historyError ? (
              <div className="px-5 py-8 text-sm text-[#a33b3b]">{historyError}</div>
            ) : activePatientHistory ? (
              <div className="space-y-4 p-5">
                <div className="rounded-[24px] border border-[#e3ece7] bg-[linear-gradient(180deg,#fbfefd,#f6fbf8)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1faa62] text-lg font-bold text-white">
                      {activePatientHistory.basicDetails.patientName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-[#142e26]">{activePatientHistory.basicDetails.patientName}</p>
                      <p className="text-sm text-[#607d74]">
                        ID: {activePatientHistory.basicDetails.patientCode}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#7a9188]">Age / Gender</p>
                      <p className="font-semibold text-[#173a31]">
                        {activePatientHistory.basicDetails.age} / {activePatientHistory.basicDetails.gender ?? 'NA'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#7a9188]">Assigned Doctor</p>
                      <p className="font-semibold text-[#173a31]">{activePatientHistory.basicDetails.assignedDoctor}</p>
                    </div>
                    <div>
                      <p className="text-[#7a9188]">Mobile</p>
                      <p className="font-semibold text-[#173a31]">{activePatientHistory.basicDetails.phone}</p>
                    </div>
                    <div>
                      <p className="text-[#7a9188]">Registration</p>
                      <p className="font-semibold text-[#173a31]">{activePatientHistory.basicDetails.registrationDate}</p>
                    </div>
                    <div>
                      <p className="text-[#7a9188]">Email</p>
                      <p className="font-semibold text-[#173a31]">{activePatientHistory.basicDetails.email || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[#7a9188]">Total Visits</p>
                      <p className="font-semibold text-[#173a31]">{activePatientHistory.basicDetails.totalVisits}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {historySections(activePatientHistory).map((section) => (
                    <div key={section.title} className="flex items-center justify-between rounded-[22px] border border-[#e3ece7] bg-[#fbfdfc] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf8f1]">{section.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-[#173a31]">{section.title}</p>
                          <p className="text-xs text-[#607d74]">{section.count} records</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#edf8f1] px-2.5 py-1 text-xs font-semibold text-[#159754]">
                        {section.count}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-[#e3ece7] bg-white">
                  <div className="border-b border-[#edf2ef] px-4 py-3">
                    <p className="text-sm font-bold text-[#142e26]">Medical History</p>
                  </div>
                  <div className="grid gap-3 px-4 py-4 text-sm text-[#173a31]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Allergies</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.allergies || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Chronic Diseases</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.chronicDiseases || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Past Surgeries</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.pastSurgeries || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Previous Treatments</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.previousTreatments || '--'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Weight</p>
                        <p className="mt-1">{activePatientHistory.medicalHistory.weight || '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Height</p>
                        <p className="mt-1">{activePatientHistory.medicalHistory.height || '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">BP</p>
                        <p className="mt-1">{activePatientHistory.medicalHistory.bp || '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Sugar</p>
                        <p className="mt-1">{activePatientHistory.medicalHistory.sugar || '--'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Health Problem</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.healthProblem || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Additional Notes</p>
                      <p className="mt-1">{activePatientHistory.medicalHistory.additionalNotes || '--'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e3ece7] bg-white">
                  <div className="border-b border-[#edf2ef] px-4 py-3">
                    <p className="text-sm font-bold text-[#142e26]">Appointment History</p>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {activePatientHistory.appointmentHistory.length > 0 ? (
                      activePatientHistory.appointmentHistory.map((item) => (
                        <div key={item.appointmentId} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#173a31]">{item.date} | {item.time}</p>
                              <p className="text-xs text-[#607d74]">{item.doctorName} | {item.appointmentType}</p>
                            </div>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#173a31]">Billing: {item.billingAmount}</p>
                          <p className="mt-1 text-sm text-[#607d74]">{item.notes || 'No appointment notes added.'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#607d74]">No appointment history found.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e3ece7] bg-white">
                  <div className="border-b border-[#edf2ef] px-4 py-3">
                    <p className="text-sm font-bold text-[#142e26]">Prescription History</p>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {activePatientHistory.prescriptionHistory.length > 0 ? (
                      activePatientHistory.prescriptionHistory.map((item) => (
                        <div key={item.prescriptionId} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                          <p className="text-sm font-semibold text-[#173a31]">{item.date} | {item.doctorName}</p>
                          <p className="mt-1 text-sm text-[#173a31]">Diagnosis: {item.diagnosis}</p>
                          <p className="mt-1 text-sm text-[#607d74]">
                            Medicines: {item.medicines.length > 0 ? item.medicines.join(', ') : 'No medicines listed'}
                          </p>
                          <p className="mt-1 text-sm text-[#607d74]">{item.notes || 'No prescription notes added.'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#607d74]">No prescription history found.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e3ece7] bg-white">
                  <div className="border-b border-[#edf2ef] px-4 py-3">
                    <p className="text-sm font-bold text-[#142e26]">Uploaded Reports / Files</p>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {activePatientHistory.uploadedReports.length > 0 ? (
                      activePatientHistory.uploadedReports.map((item) => (
                        <a
                          key={item.documentId}
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start justify-between gap-3 rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3 transition hover:border-[#1faa62]/35 hover:bg-[#f4fbf7]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#173a31]">{item.fileName}</p>
                            <p className="text-xs text-[#607d74]">{item.fileType}</p>
                          </div>
                          <span className="shrink-0 text-xs text-[#607d74]">{formatDateTime(item.uploadedAt)}</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-[#607d74]">No uploaded reports found.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#e3ece7] bg-white">
                  <div className="border-b border-[#edf2ef] px-4 py-3">
                    <p className="text-sm font-bold text-[#142e26]">Doctor Notes</p>
                  </div>
                  <div className="space-y-3 px-4 py-4">
                    {activePatientHistory.doctorNotes.length > 0 ? (
                      activePatientHistory.doctorNotes.map((item, index) => (
                        <div key={`${item.source}-${item.date}-${index}`} className="rounded-[20px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#173a31]">{item.source}</p>
                            <span className="text-xs text-[#607d74]">{item.date}</span>
                          </div>
                          <p className="mt-2 text-sm text-[#607d74]">{item.note}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#607d74]">No doctor notes found.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
};

export default Reports;
