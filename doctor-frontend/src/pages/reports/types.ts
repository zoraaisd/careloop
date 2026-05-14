export type ReportType = 'patient' | 'revenue' | 'inventory' | 'expenses';

export type DoctorOption = {
  doctorId: string;
  doctorName: string;
};

export type PatientOption = {
  patientId: string;
  patientCode: string;
  patientName: string;
  phone: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  helperText?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  kind?: 'text' | 'status' | 'currency';
};

export type ReportRow = Record<string, string | number | null | undefined>;

export type PatientHistory = {
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

export type ReportViewResponse = {
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

export type FiltersState = {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  doctorId: string;
  patientId: string;
};

export type ExportFormat = 'sheet' | 'pdf';
