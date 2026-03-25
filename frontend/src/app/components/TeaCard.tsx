import { Clock, Thermometer, Edit2, Trash2, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export interface Tea {
  id: string;
  name: string;
  description: string;
  brewTime: number; // w minutach
  temperature: number; // w stopniach Celsjusza
  image: string;
  category: 'zielona' | 'czarna' | 'biała' | 'oolong' | 'pu-erh' | 'ziołowa';
  isFavorite?: boolean;
}

interface TeaCardProps {
  tea: Tea;
  onEdit: (tea: Tea) => void;
  onDelete: (id: string) => void;
  onSelect: (tea: Tea) => void;
  onToggleFavorite?: (id: string) => void;
  showActions?: boolean;
}

export function TeaCard({ tea, onEdit, onDelete, onSelect, onToggleFavorite, showActions = true }: TeaCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex gap-3 p-3">
        <img
          src={tea.image}
          alt={tea.name}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-base flex-1">{tea.name}</h3>
            {onToggleFavorite && (
              <Button
                onClick={() => onToggleFavorite(tea.id)}
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1"
              >
                <Star
                  className={`w-4 h-4 ${tea.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {tea.description}
          </p>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{tea.brewTime} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-primary" />
              <span>{tea.temperature}°C</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onSelect(tea)}
              className="flex-1 h-8 text-xs"
            >
              Zaparz
            </Button>
            {showActions && (
              <>
                <Button
                  onClick={() => onEdit(tea)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => onDelete(tea.id)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}