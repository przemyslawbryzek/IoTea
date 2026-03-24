import { useState } from 'react';
import { Menu, LogIn, HelpCircle, Wifi } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { LoginPanel } from './LoginPanel';
import { TechSupport } from './TechSupport';
import { DeviceStatus } from './DeviceStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tea } from './TeaCard';

interface BrewHistoryItem {
  id: string;
  tea: Tea;
  brewedAt: Date;
  userId: string;
}

interface UserData {
  name: string;
  email: string;
}

interface MobileMenuProps {
  teas: Tea[];
  favorites: string[];
  history: BrewHistoryItem[];
  onToggleFavorite: (id: string) => void;
  onSelectTea: (tea: Tea) => void;
  currentUser: UserData | null;
  onLogin: (user: UserData) => void;
  onLogout: () => void;
  autoStart: boolean;
  onAutoStartChange: (value: boolean) => void;
}

export function MobileMenu({ 
  teas, 
  favorites, 
  history, 
  onToggleFavorite, 
  onSelectTea,
  currentUser,
  onLogin,
  onLogout,
  autoStart,
  onAutoStartChange
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="device" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="device" className="text-xs">
              <Wifi className="w-4 h-4 mr-1" />
              Urządzenie
            </TabsTrigger>
            <TabsTrigger value="login" className="text-xs">
              <LogIn className="w-4 h-4 mr-1" />
              Konto
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs">
              <HelpCircle className="w-4 h-4 mr-1" />
              Pomoc
            </TabsTrigger>
          </TabsList>
          <TabsContent value="device" className="mt-4">
            <DeviceStatus />
          </TabsContent>
          <TabsContent value="login" className="mt-4">
            <LoginPanel
              onClose={() => setOpen(false)}
              teas={teas}
              favorites={favorites}
              history={history}
              onToggleFavorite={onToggleFavorite}
              onSelectTea={onSelectTea}
              currentUser={currentUser}
              onLogin={onLogin}
              onLogout={onLogout}
              autoStart={autoStart}
              onAutoStartChange={onAutoStartChange}
            />
          </TabsContent>
          <TabsContent value="support" className="mt-4">
            <TechSupport />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}