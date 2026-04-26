export interface TeaCategory {
  id: number;
  name: string;
  icon_url?: string | null;
}

export interface Tea {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
  category: TeaCategory;
  instructions?: instruction[];
  source?: 'base' | 'user';
}
export interface BrewingStyle {
    id: number;
    name: string;
    description: string | null;
}

export interface instruction {
    id: number;
    teaId: number;
    styleId: number;
    tea: Tea;
    style: BrewingStyle;
    grams_per_100ml: number;
    first_infusion_seconds: number;
    increment_seconds: number;
    max_infusions: number;
}