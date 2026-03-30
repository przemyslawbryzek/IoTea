import { useState, useEffect } from 'react';
import {
  getAllTeas,
  getAllCategories,
  mapCategoryName,
  getBrewTimeInMinutes,
  getTeaImage,
  type ApiTea,
  type ApiTeaCategory,
} from '../services/teaApi';
import { Tea } from '../components/TeaCard';

// Fallback data jeśli API nie działa
const FALLBACK_TEAS: Tea[] = [
  {
    id: "fallback-1",
    name: "Long Jing",
    description: "Chestnut aroma, smooth and sweet.",
    brewTime: 0.25,
    temperature: 80,
    image: "https://images.unsplash.com/photo-1602943543714-cf535b048440?w=400",
    category: "zielona",
  },
  {
    id: "fallback-2",
    name: "Tie Guan Yin",
    description: "Floral aroma with creamy texture.",
    brewTime: 0.25,
    temperature: 95,
    image: "https://images.unsplash.com/photo-1627894006066-b45786537103?w=400",
    category: "oolong",
  },
];

export function useTeas() {
  const [teas, setTeas] = useState<Tea[]>([]);
  const [categories, setCategories] = useState<ApiTeaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('useTeas: Starting fetch...');
      setLoading(true);
      setError(null);

      // Pobierz herbaty i kategorie równolegle
      const [teasData, categoriesData] = await Promise.all([
        getAllTeas(),
        getAllCategories(),
      ]);

      console.log('useTeas: Received data:', { teasData, categoriesData });

      // Mapuj dane API na format Tea
      const mappedTeas: Tea[] = teasData.map((apiTea) => {
        const mapped = {
          id: `api-${apiTea.id}`,
          apiId: apiTea.id,
          name: apiTea.name,
          description: apiTea.description,
          brewTime: getBrewTimeInMinutes(apiTea),
          temperature: apiTea.brew_temp,
          image: getTeaImage(apiTea),
          category: mapCategoryName(apiTea.category.name),
        };
        console.log('Mapped tea:', apiTea.name, mapped);
        return mapped;
      });

      console.log('useTeas: Setting teas:', mappedTeas);
      setTeas(mappedTeas);
      setCategories(categoriesData);
      console.log('useTeas: Fetch completed successfully');
    } catch (err) {
      console.error('useTeas: Failed to fetch teas:', err);
      console.log('useTeas: Using fallback data');

      // Użyj fallback danych jeśli API nie działa
      setTeas(FALLBACK_TEAS);
      setError(err instanceof Error ? err.message : 'Nie udało się połączyć z serwerem');
    } finally {
      setLoading(false);
      console.log('useTeas: Loading set to false');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { teas, setTeas, categories, loading, error, refetch: fetchData };
}
