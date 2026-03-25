import { useState, useMemo } from "react";
import { Search, Plus, ArrowUpDown } from "lucide-react";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { TeaCard, Tea } from "./components/TeaCard";
import { TeaDialog } from "./components/TeaDialog";
import { BrewingTimer } from "./components/BrewingTimer";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  CategoryFilter,
  TeaCategory,
} from "./components/CategoryFilter";
import { MobileMenu } from "./components/MobileMenu";
import logoImage from "../assets/065ee734cc67b8b74fdd5b0b85c78061b5abaec9.png";

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

const initialTeas: Tea[] = [
  {
    id: "1",
    name: "Zielona herbata",
    description:
      "Delikatna i orzeźwiająca herbata zielona o subtelnym, lekko słodkawym smaku. Bogata w antyoksydanty.",
    brewTime: 3,
    temperature: 80,
    image:
      "https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "zielona",
  },
  {
    id: "2",
    name: "Czarna herbata",
    description:
      "Mocna i aromatyczna czarna herbata z wyrazistym smakiem. Idealna na poranek.",
    brewTime: 5,
    temperature: 95,
    image:
      "https://images.unsplash.com/photo-1693114812744-ed1b09d05984?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHRlYSUyMGN1cHxlbnwxfHx8fDE3NzMyMTAzOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "czarna",
  },
  {
    id: "3",
    name: "Biała herbata",
    description:
      "Najdelikatniejsza z herbat, o słodkim kwiatowym aromacie. Zawiera najmniej kofeiny.",
    brewTime: 7,
    temperature: 75,
    image:
      "https://images.unsplash.com/photo-1543060895-03f57478a710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMzMwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "biała",
  },
  {
    id: "4",
    name: "Oolong",
    description:
      "Herbata półfermentowana łącząca cechy herbat zielonych i czarnych. Złożony, głęboki smak.",
    brewTime: 4,
    temperature: 85,
    image:
      "https://images.unsplash.com/photo-1627894006066-b45786537103?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvb2xvbmclMjB0ZWF8ZW58MXx8fHwxNzczMjMzMDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "oolong",
  },
  {
    id: "5",
    name: "Pu-erh",
    description:
      "Fermentowana herbata o ziemistym, głębokim smaku. Z wiekiem nabiera charakteru.",
    brewTime: 5,
    temperature: 95,
    image:
      "https://images.unsplash.com/photo-1680703335176-ab1fad0af776?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdSUyMGVyaCUyMHRlYXxlbnwxfHx8fDE3NzMxMzcyMzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "pu-erh",
  },
  {
    id: "6",
    name: "Rumianek",
    description:
      "Kojący napar ziołowy o delikatnym kwiatowym smaku. Pomaga w relaksacji i zasypianiu.",
    brewTime: 8,
    temperature: 100,
    image:
      "https://images.unsplash.com/photo-1632639519728-417854c47d9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZXJiYWwlMjBjaGFtb21pbGUlMjB0ZWF8ZW58MXx8fHwxNzczMTQxMDg5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "ziołowa",
  },
  {
    id: "7",
    name: "Rooibos",
    description:
      "Czerwona herbata z Afryki Południowej, naturalnie słodka i bezkofeινowa. Bogata w minerały.",
    brewTime: 6,
    temperature: 100,
    image:
      "https://images.unsplash.com/photo-1606695980435-f0b57d051c2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb29pYm9zJTIwdGVhfGVufDF8fHx8MTc3MzIzMzA0NXww&ixlib=rb-4.1.0&q=80&w=1080",
    category: "ziołowa",
  },
  {
    id: "8",
    name: "Matcha",
    description:
      "Sproszkowana zielona herbata o intensywnym smaku i mocy. Wysoka zawartość antyoksydantów.",
    brewTime: 2,
    temperature: 70,
    image:
      "https://images.unsplash.com/photo-1708572727896-117b5ea25a86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXRjaGElMjBncmVlbiUyMHRlYXxlbnwxfHx8fDE3NzMyMTA3NTF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    category: "zielona",
  },
  {
    id: "9",
    name: "Sencha",
    description:
      "Popularna japońska herbata zielona o świeżym, trawiastym smaku i lekko słodkim posmaku.",
    brewTime: 2,
    temperature: 75,
    image:
      "https://images.unsplash.com/photo-1695188603812-4477da0b1252?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMGdyZWVuJTIwdGVhJTIwbGVhdmVzfGVufDF8fHx8MTc3NDM1MjkxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "zielona",
  },
];

function App() {
  const [teas, setTeas] = useState<Tea[]>(initialTeas);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    TeaCategory | "all"
  >("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    "asc",
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTea, setEditingTea] = useState<Tea | null>(
    null,
  );
  const [selectedTea, setSelectedTea] = useState<Tea | null>(
    null,
  );
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [userFavorites, setUserFavorites] = useState<{
    [userEmail: string]: string[];
  }>({});
  const [history, setHistory] = useState<BrewHistoryItem[]>([]);
  const [currentUser, setCurrentUser] =
    useState<UserData | null>(null);
  const [autoStart, setAutoStart] = useState(false);

  // Pobierz ulubione dla aktualnego użytkownika
  const currentUserFavorites = currentUser
    ? userFavorites[currentUser.email] || []
    : [];

  // Filtrowanie i sortowanie herbat
  const filteredTeas = useMemo(() => {
    let filtered = teas.filter((tea) =>
      tea.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    // Filtrowanie po kategorii
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (tea) => tea.category === selectedCategory,
      );
    }

    // Sortowanie
    return filtered.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [teas, searchQuery, selectedCategory, sortOrder]);

  const handleAddTea = (
    teaData: Omit<Tea, "id"> & { id?: string },
  ) => {
    if (teaData.id) {
      // Edycja istniejącej herbaty
      setTeas(
        teas.map((tea) =>
          tea.id === teaData.id ? (teaData as Tea) : tea,
        ),
      );
      toast.success("Herbata została zaktualizowana");
    } else {
      // Dodawanie nowej herbaty
      const newTea: Tea = {
        ...teaData,
        id: Date.now().toString(),
      } as Tea;
      setTeas([...teas, newTea]);
      toast.success("Herbata została dodana");
    }
    setEditingTea(null);
  };

  const handleEditTea = (tea: Tea) => {
    setEditingTea(tea);
    setIsDialogOpen(true);
  };

  const handleDeleteTea = (id: string) => {
    setTeas(teas.filter((tea) => tea.id !== id));
    toast.success("Herbata została usunięta");
  };

  const handleSelectTea = (tea: Tea) => {
    setSelectedTea(tea);
    setIsTimerOpen(true);

    // Dodaj do historii z userId
    if (currentUser) {
      const historyItem: BrewHistoryItem = {
        id: Date.now().toString(),
        tea,
        brewedAt: new Date(),
        userId: currentUser.email,
      };
      setHistory([historyItem, ...history]);
    }

    toast.success(`Wybrałeś: ${tea.name}`);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleTimerClose = () => {
    setIsTimerOpen(false);
  };

  const handleToggleFavorite = (id: string) => {
    if (!currentUser) {
      toast.error(
        "Musisz być zalogowany, aby dodać do ulubionych",
      );
      return;
    }

    setUserFavorites((prev) => {
      const userFavs = prev[currentUser.email] || [];
      const newUserFavs = userFavs.includes(id)
        ? userFavs.filter((favId) => favId !== id)
        : [...userFavs, id];

      if (userFavs.includes(id)) {
        toast.info("Usunięto z ulubionych");
      } else {
        toast.success("Dodano do ulubionych");
      }

      return {
        ...prev,
        [currentUser.email]: newUserFavs,
      };
    });
  };

  const handleLogin = (user: UserData) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    toast.info("Wylogowano");
  };

  // Filtruj historię dla aktualnego użytkownika
  const userHistory = currentUser
    ? history.filter(
        (item) => item.userId === currentUser.email,
      )
    : [];

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="iotea-theme"
    >
      <div className="min-h-screen bg-background pb-safe">
        <div className="container mx-auto px-3 py-4 max-w-md">
          {/* Mobile Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <MobileMenu
                teas={teas}
                favorites={currentUserFavorites}
                history={userHistory}
                onToggleFavorite={handleToggleFavorite}
                onSelectTea={handleSelectTea}
                currentUser={currentUser}
                onLogin={handleLogin}
                onLogout={handleLogout}
                autoStart={autoStart}
                onAutoStartChange={setAutoStart}
              />
              <img
                src={logoImage}
                alt="IoTea Logo"
                className="h-16 w-auto object-contain"
              />
              <ThemeToggle />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Zaparz herbatę w idealnych warunkach
            </p>
          </div>

          {/* Timer */}
          <BrewingTimer
            open={isTimerOpen}
            onOpenChange={setIsTimerOpen}
            tea={selectedTea}
            autoStart={autoStart}
          />

          {/* Wyszukiwanie i sortowanie */}
          <div className="flex gap-2 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Wyszukaj herbatę..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Panel kategorii */}
          <div className="mt-4">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Lista herbat */}
          <div className="space-y-3 mt-4 pb-4">
            {filteredTeas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nie znaleziono herbat
              </div>
            ) : (
              filteredTeas.map((tea) => (
                <TeaCard
                  key={tea.id}
                  tea={{
                    ...tea,
                    isFavorite: currentUserFavorites.includes(
                      tea.id,
                    ),
                  }}
                  onEdit={handleEditTea}
                  onDelete={handleDeleteTea}
                  onSelect={handleSelectTea}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))
            )}
          </div>

          {/* Dialog dodawania/edycji herbaty */}
          <TeaDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingTea(null);
            }}
            onSave={handleAddTea}
            editingTea={editingTea}
          />
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
