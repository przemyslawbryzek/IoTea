import { Settings, Bell, Clock, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface UserData {
  name: string;
  email: string;
}

interface UserSettingsProps {
  user: UserData;
  onLogout: () => void;
  autoStart: boolean;
  onAutoStartChange: (value: boolean) => void;
}

export function UserSettings({ user, onLogout, autoStart, onAutoStartChange }: UserSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Powiadomienia
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="brew-notifications" className="text-sm">
              Powiadomienia o zakończeniu parzenia
            </Label>
            <Switch id="brew-notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-alerts" className="text-sm">
              Dźwiękowe powiadomienia
            </Label>
            <Switch id="sound-alerts" defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Preferencje parzenia
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-start" className="text-sm">
              Automatyczne rozpoczęcie parzenia
            </Label>
            <Switch 
              id="auto-start" 
              checked={autoStart}
              onCheckedChange={onAutoStartChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="keep-history" className="text-sm">
              Zapisuj historię parzenia
            </Label>
            <Switch id="keep-history" defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3 pt-2">
        <div className="p-3 bg-muted rounded-lg space-y-1">
          <p className="text-xs text-muted-foreground">Konto</p>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button onClick={onLogout} variant="outline" className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Wyloguj się
        </Button>
      </div>
    </div>
  );
}