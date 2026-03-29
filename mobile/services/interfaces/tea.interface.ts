export interface TeaCategory {
  id: number;
  name: string;
}

export interface Tea {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
  category: TeaCategory;
}