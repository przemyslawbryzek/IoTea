import { History, Calendar } from 'lucide-react';
import { Tea } from './TeaCard';
import { Button } from './ui/button';

interface BrewHistoryItem {
  id: string;
  tea: Tea;
  brewedAt: Date;
  userId: string;
}

interface UserHistoryProps {
  history: BrewHistoryItem[];
  onSelectTea: (tea: Tea) => void;
}

export function UserHistory({ history, onSelectTea }: UserHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Nie masz jeszcze historii parzenia
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tutaj pojawią się herbaty, które zaparzyłeś
        </p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Przed chwilą';
    if (minutes < 60) return `${minutes} min temu`;
    if (hours < 24) return `${hours} godz. temu`;
    if (days === 1) return 'Wczoraj';
    if (days < 7) return `${days} dni temu`;

    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {history.map(item => (
        <div key={item.id} className="flex gap-3 p-3 bg-muted rounded-lg">
          <img src={item.tea.image} alt={item.tea.name} className="w-16 h-16 rounded object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{item.tea.name}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(item.brewedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <span>{item.tea.brewTime} min</span>
                <span className="mx-2">•</span>
                <span>{item.tea.temperature}°C</span>
              </div>
              <Button
                onClick={() => onSelectTea(item.tea)}
                size="sm"
                className="h-7 text-xs"
              >
                Zaparz ponownie
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}