export type UserRole = 'ADMIN' | 'OPERATOR' | 'SECURITY';

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SortingSession {
  id: string;
  session_code: string;
  status: 'RUNNING' | 'CLOSED' | 'RECONCILED';
  created_at: string;
  operator_id: string;
  operator_name?: string;
  total_items: number;
  transporter_id?: number;
  transporter_name?: string;
}

export interface SortingDetail {
  id: string;
  session_id: string;
  barcode_resi: string;
  scanned_at: string;
  is_validated_handover: boolean;
}

export interface MasterTransporter {
  id: number;
  transporter_name: string;
  tracking_prefix: string;
  is_active: boolean;
  created_at: string;
}

export interface HistoryLog {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_by: string;
  driver: string;
  transportation_number: string;
  status: string;
  security_sign: string;
  driver_sign?: string;
}

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'emerald' | 'blue' | 'amber' | 'violet';
  subtitle?: string;
}

export interface ScanResult {
  success: boolean;
  message: string;
  session_code?: string;
  transporter?: string;
}