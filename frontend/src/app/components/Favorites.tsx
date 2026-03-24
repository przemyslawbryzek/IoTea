import { Star } from 'lucide-react';
import { Tea } from './TeaCard';
import { Button } from './ui/button';

interface FavoritesProps {
  favorites: Tea[];
  onToggleFavorite: (id: string) => void;
  onSelectTea: (tea: Tea) => void;
}

export function Favorites({ favorites, onToggleFavorite, onSelectTea }: FavoritesProps) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nie masz jeszcze żadnych ulubionych herbat
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Kliknij gwiazdkę przy herbacie, aby dodać ją do ulubionych
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {favorites.map(tea => (
        <div key={tea.id} className="flex gap-3 p-3 bg-muted rounded-lg">
          <img src={tea.image} alt={tea.name} className="w-16 h-16 rounded object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold text-sm">{tea.name}</h4>
              <Button
                onClick={() => onToggleFavorite(tea.id)}
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
              >
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{tea.description}</p>
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <span>{tea.brewTime} min</span>
                <span className="mx-2">•</span>
                <span>{tea.temperature}°C</span>
              </div>
              <Button
                onClick={() => onSelectTea(tea)}
                size="sm"
                className="h-7 text-xs"
              >
                Zaparz
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
