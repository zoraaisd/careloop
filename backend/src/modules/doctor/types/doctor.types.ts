import type {
  AppointmentStatus,
} from '../../../entities/appointment.entity';
import type {
  ChatMessageType,
  ChatSenderType,
} from '../../../entities/chat-message.entity';
import type { FollowUpStatus } from '../../../entities/chat.entity';
import type { ActivityDirection } from '../../../entities/activity-log.entity';
import type {
  ExpenseActivityType,
} from '../../../entities/expense-activity.entity';
import type {
  PatientVerificationStatus,
} from '../../../entities/patient.entity';

export interface DoctorMetricCard {
  label: string;
  value: number;
  helperText: string;
}

export interface DoctorSummaryCard {
  totalPatients: number;
  waVerifiedCount: number;
  appointmentsCount: number;
  prescriptionsCount: number;
  unreadPatientChatsCount: number;
  waMessagesSentCount: number;
}

export interface DoctorIdentity {
  doctorId: string | null;
  doctorName: string;
  doctorInitials: string;
  role: string;
}

export interface ActivityItem {
  activityId: string;
  type: string;
  message: string;
  direction: ActivityDirection;
  createdAt: string;
}

export interface PendingChatItem {
  chatId: string;
  patientId: string;
  patientName: string;
  lastMessage: string;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface TodayAppointmentItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export interface DashboardResponse {
  summary: DoctorSummaryCard;
  metricCards: DoctorMetricCard[];
  recentActivities: ActivityItem[];
  pendingPatientChats: PendingChatItem[];
  todaysAppointments: TodayAppointmentItem[];
  currentDoctor: DoctorIdentity | null;
}

export interface PatientActionFlags {
  canSendOtp: boolean;
  canOpenProfile: boolean;
  canSendSlots: boolean;
  canOpenChat: boolean;
  canDeactivate: boolean;
}

export interface DoctorPatient {
  patientId: string;
  name: string;
  doctorName: string | null;
  phone: string;
  age: number;
  email: string | null;
  gender: string | null;
  bloodGroup: string | null;
  condition: string | null;
  notes: string | null;
  verificationStatus: PatientVerificationStatus;
  whatsappVerified: boolean;
  createdAt: string;
  lastVisitAt: string | null;
  isActive: boolean;
  actions: PatientActionFlags;
}

export interface PatientListResponse {
  items: DoctorPatient[];
  total: number;
}

export interface DoctorAppointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  day: string;
  date: string;
  time: string;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  billingAmount: number;
}

export interface AppointmentListResponse {
  items: DoctorAppointment[];
  total: number;
}

export interface CalendarDoctorItem {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
}

export interface CalendarSlotItem {
  slotId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  day: string;
  time: string;
  isAvailable: boolean;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
}

export interface CalendarScheduleSummary {
  today: number;
  waiting: number;
  engaged: number;
  done: number;
}

export interface CalendarResponse {
  doctorId: string | null;
  dateFrom: string;
  dateTo: string;
  doctors: CalendarDoctorItem[];
  summary: CalendarScheduleSummary;
  availableSlots: CalendarSlotItem[];
  bookedSlots: CalendarSlotItem[];
}

export interface PrescriptionMedicineItem {
  medicineName: string;
  dosage: string;
  instruction: string;
}

export interface PrescriptionItem {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  medicines: PrescriptionMedicineItem[];
  medicinesSummary: string;
  notes: string | null;
  prescriptionDate: string;
  pdfUrl: string | null;
  sentAt: string | null;
  resendCount: number;
}

export interface PrescriptionListResponse {
  items: PrescriptionItem[];
  total: number;
}

export interface ChatConversationItem {
  chatId: string;
  patientId: string;
  doctorId: string | null;
  patientName: string;
  patientPhone: string;
  lastMessage: string;
  messageType: string | null;
  messageTime: string | null;
  unreadCount: number;
  followUpStatus: FollowUpStatus;
}

export interface ChatMessageItem {
  messageId: string;
  direction: 'inbound' | 'outbound';
  senderType: ChatSenderType;
  messageType: ChatMessageType;
  messageBody: string;
  attachmentUrl: string | null;
  messageTime: string;
}

export interface ChatThreadResponse {
  conversation: ChatConversationItem;
  messages: ChatMessageItem[];
}

export interface InventoryListItem {
  inventoryItemId: string;
  itemName: string;
  sku: string | null;
  medicineType: string | null;
  category: string;
  stockQuantity: number;
  stockUnit: string;
  strengthComposition: string | null;
  barcodeQrCode: string | null;
  storageType: string | null;
  prescriptionRequired: boolean;
  gstTax: number;
  purchasePrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  reorderLevel: number;
  isActive: boolean;
  storageArea: string | null;
  rackShelf: string | null;
  row: string | null;
  column: string | null;
  boxBinNumber: string | null;
  slotPosition: string | null;
  notes: string | null;
  vendor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySummary {
  itemsCount: number;
  totalUnits: number;
  lowStockCount: number;
  stockValue: number;
}

export interface InventoryResponse {
  summary: InventorySummary;
  items: InventoryListItem[];
}

export interface ExpenseEntryItem {
  entryId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
  type: ExpenseActivityType;
}

export interface ExpenseSummary {
  entriesCount: number;
  totalSpend: number;
  averageSpend: number;
  categoriesCount: number;
}

export interface ExpenseResponse {
  summary: ExpenseSummary;
  items: ExpenseEntryItem[];
}

export interface ReportSummary {
  newPatients: number;
  appointments: number;
  revenue: number;
  expenses: number;
  net: number;
  averageBilling: number;
}

export interface ReportPatientRow {
  patientId: string;
  patientName: string;
  phone: string;
  appointmentCount: number;
  prescriptionCount: number;
  revenue: number;
  lastVisit: string | null;
  status: PatientVerificationStatus;
}

export interface ReportResponse {
  filters: {
    dateFrom: string;
    dateTo: string;
  };
  summary: ReportSummary;
  patients: ReportPatientRow[];
}
