import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { UserProfile } from './UserProfile';
import { Tea } from './TeaCard';

interface LoginPanelProps {
  onClose: () => void;
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

const ADMIN_USER = {
  email: 'admin.admin@mail.com',
  password: 'admin',
  name: 'Administrator'
};

export function LoginPanel({ 
  onClose, 
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
}: LoginPanelProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Sprawdź admin użytkownika
    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
      onLogin({ name: ADMIN_USER.name, email: ADMIN_USER.email });
      toast.success('Witaj, Administratorze!');
      setEmail('');
      setPassword('');
      return;
    }

    // Symulacja logowania dla innych użytkowników
    if (email && password) {
      onLogin({ name: email.split('@')[0], email });
      toast.success('Zalogowano pomyślnie!');
      setEmail('');
      setPassword('');
    } else {
      toast.error('Wypełnij wszystkie pola');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Symulacja rejestracji
    if (email && password && username) {
      onLogin({ name: username, email });
      setIsRegistering(false);
      toast.success('Konto zostało utworzone!');
      setEmail('');
      setPassword('');
      setUsername('');
    } else {
      toast.error('Wypełnij wszystkie pola');
    }
  };

  if (currentUser) {
    return (
      <UserProfile
        user={currentUser}
        teas={teas}
        favorites={favorites}
        history={history}
        onLogout={onLogout}
        onToggleFavorite={onToggleFavorite}
        onSelectTea={onSelectTea}
        autoStart={autoStart}
        onAutoStartChange={onAutoStartChange}
      />
    );
  }

  if (isRegistering) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Rejestracja
          </CardTitle>
          <CardDescription>Utwórz nowe konto IoTea</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nazwa użytkownika</Label>
              <Input
                id="username"
                type="text"
                placeholder="Twoja nazwa"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Hasło</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Button type="submit" className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Zarejestruj się
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsRegistering(false)}
              >
                Masz już konto? Zaloguj się
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Logowanie
        </CardTitle>
        <CardDescription>Zaloguj się do swojego konta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Button type="submit" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Zaloguj się
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsRegistering(true)}
            >
              Nie masz konta? Zarejestruj się
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}