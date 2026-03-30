// Typy odpowiedzi z API
export interface ApiTeaCategory {
  id: number;
  name: string;
}

export interface ApiBrewInstruction {
  id: number;
  teaId: number;
  styleId: number;
  grams_per_100ml: string;
  first_infusion_seconds: number;
  increment_seconds: number;
  max_infusions: number;
  style: {
    id: number;
    name: string;
    description: string;
  };
}

export interface ApiTea {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
  category: ApiTeaCategory;
  instructions?: ApiBrewInstruction[];
}

const API_BASE_URL = 'http://127.0.0.1:30080/api';

// Domyślny obrazek dla herbat bez zdjęcia
const DEFAULT_TEA_IMAGE = 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400';

// Mapowanie nazw kategorii z angielskiego na polskie
const categoryMap: Record<string, string> = {
  'Green': 'zielona',
  'Black': 'czarna',
  'White': 'biała',
  'Oolong': 'oolong',
  'Pu-erh': 'pu-erh',
  'Herbal': 'ziołowa',
};

// Pobierz wszystkie herbaty
export async function getAllTeas(): Promise<ApiTea[]> {
  console.log('Fetching teas from:', `${API_BASE_URL}/tea`);

  const response = await fetch(`${API_BASE_URL}/tea`, {
    headers: {
      'accept': 'application/json',
    },
  });

  console.log('Status:', response.status);
  console.log('Status text:', response.statusText);
  console.log('Content-Type:', response.headers.get('content-type'));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed response body:', errorText);
    throw new Error(`Failed to fetch teas: ${response.statusText}`);
  }

  const rawText = await response.text();
  console.log('RAW RESPONSE START');
  console.log(rawText);
  console.log('RAW RESPONSE END');

  const data = JSON.parse(rawText);
  console.log('Fetched teas data:', data);

  return data;
}

// Pobierz wszystkie kategorie
export async function getAllCategories(): Promise<ApiTeaCategory[]> {
  const response = await fetch(`${API_BASE_URL}/tea/category`, {
    headers: {
      'accept': '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

// Pobierz herbaty według kategorii
export async function getTeasByCategory(categoryId: number): Promise<ApiTea[]> {
  const response = await fetch(`${API_BASE_URL}/tea/category/${categoryId}`, {
    headers: {
      'accept': '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch teas by category: ${response.statusText}`);
  }

  return response.json();
}

// Pobierz herbatę po ID
export async function getTeaById(teaId: number): Promise<ApiTea> {
  const response = await fetch(`${API_BASE_URL}/tea/${teaId}`, {
    headers: {
      'accept': '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tea: ${response.statusText}`);
  }

  return response.json();
}

// Funkcje pomocnicze do mapowania danych

export function mapCategoryName(apiCategoryName: string): string {
  return categoryMap[apiCategoryName] || apiCategoryName.toLowerCase();
}

export function getBrewTimeInMinutes(apiTea: ApiTea): number {
  // Jeśli są instrukcje zaparzania, użyj czasu z pierwszej infuzji
  if (apiTea.instructions && apiTea.instructions.length > 0) {
    const firstInfusion = apiTea.instructions[0];
    // Konwertuj sekundy na minuty, zaokrąglij do 1 miejsca po przecinku
    return Math.round((firstInfusion.first_infusion_seconds / 60) * 10) / 10;
  }

  // Domyślny czas zaparzania na podstawie kategorii
  const categoryDefaults: Record<string, number> = {
    'Green': 3,
    'Black': 5,
    'White': 7,
    'Oolong': 4,
    'Pu-erh': 5,
    'Herbal': 6,
  };

  return categoryDefaults[apiTea.category.name] || 3;
}

export function getTeaImage(apiTea: ApiTea): string {
  return apiTea.image_url || DEFAULT_TEA_IMAGE;
}
