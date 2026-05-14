import type {
  ExportFormat,
  FiltersState,
  ReportType,
  ReportViewResponse,
} from './types';

export const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: 'patient', label: 'Patient Report' },
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'expenses', label: 'Expenses Report' },
];

export const PATIENT_REPORT_COLUMN_KEYS = [
  'patientId',
  'patientName',
  'ageGender',
  'doctorName',
  'phone',
  'registeredDate',
  'totalVisits',
] as const;

export const REVENUE_REPORT_COLUMN_KEYS = [
  'invoiceId',
  'date',
  'patientName',
  'doctorName',
  'supplier',
  'method',
  'consultationFee',
  'patientFee',
  'totalAmount',
] as const;

export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDefaultFilters = (): FiltersState => {
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

export const emptyReport: ReportViewResponse = {
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

export const getStatusPill = (value: string | number | null | undefined) => {
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

export const getCellAlignment = (align?: 'left' | 'right' | 'center') => {
  if (align === 'right') {
    return 'text-right';
  }

  if (align === 'center') {
    return 'text-center';
  }

  return 'text-left';
};

const formatDisplayId = (prefix: string, index: number) => `${prefix}${String(index + 1).padStart(3, '0')}`;

const isFormattedReportId = (value: string, prefix: string) =>
  new RegExp(`^${prefix}\\d{3}$`, 'i').test(value.trim());

export const withDisplayIds = (report: ReportViewResponse, reportType: ReportType): ReportViewResponse => {
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

export const withSupplierColumn = (report: ReportViewResponse, reportType: ReportType): ReportViewResponse => {
  if (reportType === 'patient') {
    return {
      ...report,
      columns: report.columns.filter((column) =>
        PATIENT_REPORT_COLUMN_KEYS.includes(column.key as (typeof PATIENT_REPORT_COLUMN_KEYS)[number]),
      ),
    };
  }

  const columnsWithoutHiddenFields =
    reportType === 'revenue'
      ? report.columns.filter((column) =>
          REVENUE_REPORT_COLUMN_KEYS.includes(column.key as (typeof REVENUE_REPORT_COLUMN_KEYS)[number]),
        )
      : report.columns;

  const hasSupplierColumn = columnsWithoutHiddenFields.some((column) => column.key === 'supplier');
  if (hasSupplierColumn) {
    return {
      ...report,
      columns: columnsWithoutHiddenFields,
    };
  }

  const nextColumns = [...columnsWithoutHiddenFields];
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

export const withoutHiddenMetrics = (report: ReportViewResponse): ReportViewResponse => ({
  ...report,
  metrics: report.metrics.filter((metric) => metric.label !== 'Filtered Total Amount'),
});

export const getExportFileName = (baseFileName: string, format: ExportFormat) => {
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  return baseFileName.replace(/\.[^.]+$/, `.${extension}`);
};

export const normalizeSearchValue = (value: string | number | null | undefined) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const matchesNormalizedSearch = (
  query: string,
  values: Array<string | number | null | undefined>,
) => {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const joinedValue = values.map((value) => String(value ?? '')).join(' ');
  if (normalizeSearchValue(joinedValue).includes(normalizedQuery)) {
    return true;
  }

  return values.some((value) => {
    const rawValue = String(value ?? '').toLowerCase().trim();
    const normalizedValue = normalizeSearchValue(value);

    if (normalizedValue.includes(normalizedQuery)) {
      return true;
    }

    return rawValue.split(/\s+/).some((part) => normalizeSearchValue(part).includes(normalizedQuery));
  });
};

export const formatDateTime = (value: string) => {
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
