import { useState, useMemo } from "react";
import { Search, Plus, ArrowUpDown, Loader2 } from "lucide-react";
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
import { useTeas } from "./hooks/useTeas";
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

function App() {
  const { teas, setTeas, categories, loading, error, refetch } = useTeas();

  console.log('App render:', { teas: teas.length, loading, error });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
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

  // Dostępne kategorie herbat
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    teas.forEach((tea) => {
      if (tea.category) {
        categorySet.add(tea.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [teas]);

  // Filtrowanie i sortowanie herbat
  const filteredTeas = useMemo(() => {
    console.log('Computing filteredTeas from:', teas.length, 'teas');
    let filtered = teas.filter((tea) =>
      tea.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    console.log('After search filter:', filtered.length);

    // Filtrowanie po kategorii
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (tea) => tea.category === selectedCategory,
      );
      console.log('After category filter:', filtered.length);
    }

    // Sortowanie
    const sorted = filtered.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });

    console.log('Final filtered teas:', sorted.length);
    return sorted;
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
    // Nie pozwól na edycję herbat z API
    if (tea.apiId) {
      toast.error("Nie możesz edytować herbat z bazy danych");
      return;
    }
    setEditingTea(tea);
    setIsDialogOpen(true);
  };

  const handleDeleteTea = (id: string) => {
    // Znajdź herbatę
    const tea = teas.find((t) => t.id === id);

    // Nie pozwól na usuwanie herbat z API
    if (tea?.apiId) {
      toast.error("Nie możesz usunąć herbat z bazy danych");
      return;
    }

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
              availableCategories={availableCategories}
            />
          </div>

          {/* Lista herbat */}
          <div className="space-y-3 mt-4 pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Ładowanie herbat...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-2">Błąd podczas ładowania herbat</p>
                <p className="text-xs text-muted-foreground mb-4">{error}</p>
                <Button onClick={refetch} variant="outline" size="sm">
                  Spróbuj ponownie
                </Button>
              </div>
            ) : filteredTeas.length === 0 ? (
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
                  showActions={!tea.apiId}
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
