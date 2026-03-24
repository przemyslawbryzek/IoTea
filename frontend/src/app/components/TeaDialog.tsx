import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tea } from './TeaCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tea: Omit<Tea, 'id'> & { id?: string }) => void;
  editingTea?: Tea | null;
}

export function TeaDialog({ open, onOpenChange, onSave, editingTea }: TeaDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brewTime, setBrewTime] = useState('');
  const [temperature, setTemperature] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState<Tea['category']>('zielona');

  useEffect(() => {
    if (editingTea) {
      setName(editingTea.name);
      setDescription(editingTea.description);
      setBrewTime(editingTea.brewTime.toString());
      setTemperature(editingTea.temperature.toString());
      setImage(editingTea.image);
      setCategory(editingTea.category);
    } else {
      setName('');
      setDescription('');
      setBrewTime('');
      setTemperature('');
      setImage('');
      setCategory('zielona');
    }
  }, [editingTea, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const teaData = {
      name,
      description,
      brewTime: parseInt(brewTime),
      temperature: parseInt(temperature),
      image: image || 'https://images.unsplash.com/photo-1597318181275-47e0f0229572',
      category,
      ...(editingTea && { id: editingTea.id })
    };

    onSave(teaData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingTea ? 'Edytuj herbatę' : 'Dodaj nową herbatę'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa herbaty</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Zielona herbata"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opisz smak i właściwości herbaty..."
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as Tea['category'])}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zielona">🍃 Zielona</SelectItem>
                <SelectItem value="czarna">☕ Czarna</SelectItem>
                <SelectItem value="biała">🤍 Biała</SelectItem>
                <SelectItem value="oolong">🍂 Oolong</SelectItem>
                <SelectItem value="pu-erh">🍵 Pu-erh</SelectItem>
                <SelectItem value="ziołowa">🌿 Ziołowa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brewTime">Czas parzenia (min)</Label>
              <Input
                id="brewTime"
                type="number"
                min="1"
                max="60"
                value={brewTime}
                onChange={(e) => setBrewTime(e.target.value)}
                placeholder="3"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperatura (°C)</Label>
              <Input
                id="temperature"
                type="number"
                min="50"
                max="100"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="80"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">URL zdjęcia (opcjonalnie)</Label>
            <Input
              id="image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit">
              {editingTea ? 'Zapisz zmiany' : 'Dodaj herbatę'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
