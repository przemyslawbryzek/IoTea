import { Button } from './ui/button';

export type TeaCategory = 'zielona' | 'czarna' | 'biała' | 'oolong' | 'pu-erh' | 'ziołowa';

interface CategoryFilterProps {
  selectedCategory: TeaCategory | 'all';
  onCategoryChange: (category: TeaCategory | 'all') => void;
}

const categories: { value: TeaCategory; label: string; emoji: string }[] = [
  { value: 'zielona', label: 'Zielona', emoji: '🍃' },
  { value: 'czarna', label: 'Czarna', emoji: '☕' },
  { value: 'biała', label: 'Biała', emoji: '🤍' },
  { value: 'oolong', label: 'Oolong', emoji: '🍂' },
  { value: 'pu-erh', label: 'Pu-erh', emoji: '🍵' },
  { value: 'ziołowa', label: 'Ziołowa', emoji: '🌿' },
];

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
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
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.value)}
            className="rounded-full"
          >
            <span className="mr-1.5">{category.emoji}</span>
            {category.label}
          </Button>
        ))}
      </div>
    </div>
  );
}