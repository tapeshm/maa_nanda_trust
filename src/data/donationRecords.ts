export interface DonationRecord {
  id: string;
  name: string | null;
  mobile: string | null;
  pan_number: string | null;
  committed_amount: number | null;
  donated_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface DonationRecordInput {
  name?: string;
  mobile?: string;
  pan_number?: string;
  committed_amount?: number;
}

export interface DonationRecordUpdate {
  name?: string | null;
  mobile?: string | null;
  pan_number?: string | null;
  committed_amount?: number | null;
  donated_amount?: number | null;
}
