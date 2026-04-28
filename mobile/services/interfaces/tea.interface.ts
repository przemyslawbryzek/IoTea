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
  source?: 'base' | 'user';
}