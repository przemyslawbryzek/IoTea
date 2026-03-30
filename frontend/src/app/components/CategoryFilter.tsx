import { Button } from './ui/button';

export type TeaCategory = string;

interface CategoryFilterProps {
  selectedCategory: string | 'all';
  onCategoryChange: (category: string | 'all') => void;
  availableCategories?: string[];
}

// Mapowanie emoji dla znanych kategorii
const categoryEmojis: Record<string, string> = {
  'zielona': '🍃',
  'czarna': '☕',
  'biała': '🤍',
  'oolong': '🍂',
  'pu-erh': '🍵',
  'ziołowa': '🌿',
};

// Mapowanie etykiet dla kategorii
const categoryLabels: Record<string, string> = {
  'zielona': 'Zielona',
  'czarna': 'Czarna',
  'biała': 'Biała',
  'oolong': 'Oolong',
  'pu-erh': 'Pu-erh',
  'ziołowa': 'Ziołowa',
};

function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryEmoji(category: string): string {
  return categoryEmojis[category] || '🍵';
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  availableCategories = []
}: CategoryFilterProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Kategorie herbat</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('all')}
          className="rounded-full"
        >
          Wszystkie
        </Button>
        {availableCategories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="rounded-full"
          >
            <span className="mr-1.5">{getCategoryEmoji(category)}</span>
            {getCategoryLabel(category)}
          </Button>
        ))}
      </div>
    </div>
  );
}