export interface BrewSummary {
  id: number;
  device_id: number;
  device_name?: string;
  instruction_id: number;
  tea_id?: number | null;
  tea_source?: 'base' | 'user';
  tea_name?: string | null;
  tea_image_url?: string | null;
  tea_temp?: number | null;
  max_brew?: number;
  total_brew_seconds?: number | null;
  volume_ml: number;
  brew_number: number;
  start_time: string;
  end_time: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BrewStatusEvent {
  status: string;
  ts: string;
  current_temp?: number | null;
}