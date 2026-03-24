import { useState } from 'react';
import { User, Star, History, Settings, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Favorites } from './Favorites';
import { UserHistory } from './UserHistory';
import { UserSettings } from './UserSettings';
import { Tea } from './TeaCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface UserData {
  name: string;
  email: string;
}

interface BrewHistoryItem {
  id: string;
  tea: Tea;
  brewedAt: Date;
  userId: string;
}

interface UserProfileProps {
  user: UserData;
  teas: Tea[];
  favorites: string[];
  history: BrewHistoryItem[];
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  onSelectTea: (tea: Tea) => void;
  autoStart: boolean;
  onAutoStartChange: (value: boolean) => void;
}

export function UserProfile({
  user,
  teas,
  favorites,
  history,
  onLogout,
  onToggleFavorite,
  onSelectTea,
  autoStart,
  onAutoStartChange
}: UserProfileProps) {
  const [openSection, setOpenSection] = useState<string>('');
  const favoriteTeas = teas.filter(tea => favorites.includes(tea.id));

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Ulubione */}
          <Collapsible open={openSection === 'favorites'} onOpenChange={() => toggleSection('favorites')}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-4 h-auto hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Ulubione</div>
                    <div className="text-xs text-muted-foreground">{favoriteTeas.length} herbat</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'favorites' ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <Favorites
                favorites={favoriteTeas}
                onToggleFavorite={onToggleFavorite}
                onSelectTea={onSelectTea}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Historia */}
          <Collapsible open={openSection === 'history'} onOpenChange={() => toggleSection('history')}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-4 h-auto hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Historia</div>
                    <div className="text-xs text-muted-foreground">{history.length} zaparzonych</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'history' ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <UserHistory history={history} onSelectTea={onSelectTea} />
            </CollapsibleContent>
          </Collapsible>

          {/* Ustawienia */}
          <Collapsible open={openSection === 'settings'} onOpenChange={() => toggleSection('settings')}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-4 h-auto hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Ustawienia</div>
                    <div className="text-xs text-muted-foreground">Zarządzaj kontem</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${openSection === 'settings' ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <UserSettings 
                user={user} 
                onLogout={onLogout}
                autoStart={autoStart}
                onAutoStartChange={onAutoStartChange}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}