export interface QRCodeRecord {
  id: string;
  code: string; // e.g. "001", "002"
  name: string; // e.g. "QR 001" or "Restaurante Silva"
  destination_url: string; // e.g. "https://google.com"
  active: boolean; // true = redirects, false = temporarily disabled
  user_id?: string | null; // reserved for future multi-user auth
  scan_count: number; // total redirection scans
  last_scanned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QRCodeStats {
  total: number;
  active: number;
  inactive: number;
  totalScans: number;
}

export interface BulkCreatePayload {
  quantity: number;
  namePrefix?: string;
  codePrefix?: string;
  startNumber?: number;
  defaultDestinationUrl?: string;
}

export interface CreateQRCodePayload {
  code: string;
  name: string;
  destination_url: string;
  active?: boolean;
}

export interface UpdateQRCodePayload {
  name: string;
  destination_url: string;
  active: boolean;
}
