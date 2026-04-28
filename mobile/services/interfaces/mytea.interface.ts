import type { TeaCategory, BrewingStyle } from './tea.interface';

export interface MyTeaInstruction {
  id: number;
  userTeaId: number;
  styleId: number;
  style: BrewingStyle;
  grams_per_100ml: number;
  first_infusion_seconds: number;
  increment_seconds: number;
  max_infusions: number;
}

export interface MyTeaSummary {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
  category: TeaCategory;
  created_at: string;
  updated_at: string;
}

export interface MyTeaDetail extends MyTeaSummary {
  instructions: MyTeaInstruction[];
}

export interface MyTeaFormValues {
  name: string;
  description: string;
  image_url: string;
  categoryId: number;
  brew_temp: number;
}

export interface MyTeaInstructionFormValues {
  styleId: number;
  grams_per_100ml: number;
  first_infusion_seconds: number;
  increment_seconds: number;
  max_infusions: number;
}
