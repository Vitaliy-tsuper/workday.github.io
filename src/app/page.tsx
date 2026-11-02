"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass as HomeIcon, LogOut } from "lucide-react";
import { WorkdayForm } from "@/components/workday-form";
import { TotalsSummary } from "@/components/totals-summary";
import { WorkdayCalendar } from "@/components/workday-calendar";
import { WorkdayReport } from "@/components/workday-report";
import type { WorkdayData } from "@/lib/dates";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { user, loading, signOutGuest } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [workdays, setWorkdays] = useState<WorkdayData>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dataLoading, setDataLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(100);
  const [categoryRates, setCategoryRates] = useState<Record<string, number>>({});

  const [savedCategories, setSavedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && db) {
      const fetchData = async () => {
        setDataLoading(true);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const normalizedWorkdays: WorkdayData = {};
            if (data.workdays) {
              Object.keys(data.workdays).forEach(key => {
                const val = data.workdays[key];
                if (typeof val === 'boolean') {
                  normalizedWorkdays[key] = { worked: val, hours: val ? 8 : 0 };
                } else {
                  normalizedWorkdays[key] = val;
                }
              });
            }
            if (typeof window !== "undefined") {
              try {
                const storedLocal = localStorage.getItem("workdays");
                if (storedLocal) {
                  const parsed = JSON.parse(storedLocal);
                  Object.assign(normalizedWorkdays, parsed);
                }
              } catch (e) {}
            }
            setWorkdays(normalizedWorkdays);
            
            if (data.savedCategories) {
              setSavedCategories(data.savedCategories);
            }
            
            if (data.categoryRates) {
              setCategoryRates(data.categoryRates);
            }

            if (data.hourlyRate !== undefined) {
              setHourlyRate(data.hourlyRate);
            } else if (data.dailyRate !== undefined) {
              setHourlyRate(data.dailyRate / 8);
            }
          } else {
            let initialWorkdays: WorkdayData = {};
            let initialCategories: string[] = [];
            let initialCategoryRates: Record<string, number> = {};
            let initialHourlyRate = 100;

            if (typeof window !== "undefined") {
              try {
                const storedWorkdays = localStorage.getItem("workdays");
                if (storedWorkdays) initialWorkdays = JSON.parse(storedWorkdays);
                const storedCategories = localStorage.getItem("savedCategories");
                if (storedCategories) initialCategories = JSON.parse(storedCategories);
                const storedRates = localStorage.getItem("categoryRates");
                if (storedRates) initialCategoryRates = JSON.parse(storedRates);
                const storedRate = localStorage.getItem("hourlyRate");
                if (storedRate) initialHourlyRate = Number(storedRate);
              } catch (e) {}
            }

            setWorkdays(initialWorkdays);
            setSavedCategories(initialCategories);
            setCategoryRates(initialCategoryRates);
            setHourlyRate(initialHourlyRate);

            try {
              await setDoc(doc(db, "users", user.uid), {
                workdays: initialWorkdays,
                hourlyRate: initialHourlyRate,
                savedCategories: initialCategories,
                categoryRates: initialCategoryRates
              });
            } catch (e) {
              console.warn("Initial user doc creation error:", e);
            }
          }
        } catch (error) {
          console.error("Firestore read error:", error);
          if (typeof window !== "undefined") {
            try {
              const storedWorkdays = localStorage.getItem("workdays");
              if (storedWorkdays) setWorkdays(JSON.parse(storedWorkdays));
              const storedCategories = localStorage.getItem("savedCategories");
              if (storedCategories) setSavedCategories(JSON.parse(storedCategories));
              const storedRates = localStorage.getItem("categoryRates");
              if (storedRates) setCategoryRates(JSON.parse(storedRates));
              const storedHourlyRate = localStorage.getItem("hourlyRate");
              if (storedHourlyRate) setHourlyRate(Number(storedHourlyRate));
            } catch (e) {}
          }
        } finally {
          setDataLoading(false);
        }
      };
      fetchData();
    } else if (user && !db) {
      if (typeof window !== "undefined") {
        try {
          const storedWorkdays = localStorage.getItem("workdays");
          if (storedWorkdays) setWorkdays(JSON.parse(storedWorkdays));
          const storedCategories = localStorage.getItem("savedCategories");
          if (storedCategories) setSavedCategories(JSON.parse(storedCategories));
          const storedRates = localStorage.getItem("categoryRates");
          if (storedRates) setCategoryRates(JSON.parse(storedRates));
          const storedHourlyRate = localStorage.getItem("hourlyRate");
          if (storedHourlyRate) setHourlyRate(Number(storedHourlyRate));
        } catch (e) {
          console.error("Local data loading error:", e);
        }
      }
      setDataLoading(false);
    } else if (!loading) {
      setDataLoading(false);
    }
  }, [user, loading, toast]);

  const handleHourlyRateChange = async (newRate: number) => {
    if (!user) return;
    setHourlyRate(newRate);
    if (!db) {
      if (typeof window !== "undefined") localStorage.setItem("hourlyRate", String(newRate));
      return;
    }
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { hourlyRate: newRate });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Помилка оновлення",
            description: "Не вдалося оновити ставку.",
        });
    }
  };

  const handleCategoryRateChange = async (category: string, newRate: number) => {
    if (!user) return;
    const newCategoryRates = { ...categoryRates, [category]: newRate };
    setCategoryRates(newCategoryRates);
    if (!db) {
      if (typeof window !== "undefined") localStorage.setItem("categoryRates", JSON.stringify(newCategoryRates));
      return;
    }
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { [`categoryRates.${category}`]: newRate });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Помилка оновлення",
            description: "Не вдалося оновити ставку для категорії.",
        });
    }
  };

  const handleSaveWorkday = async (
    date: Date, 
    hours: number, 
    categories?: { name: string; hours: number; startTime?: string; endTime?: string }[],
    interval?: { startTime?: string; endTime?: string }
  ) => {
    if (!user) return;
    const dateString = format(date, 'yyyy-MM-dd');
    
    const cleanEntry: Record<string, any> = { 
      worked: true, 
      hours: Number(hours) || 0,
      startTime: interval?.startTime || "09:00",
      endTime: interval?.endTime || "17:00",
    };

    if (categories && categories.length > 0) {
      const validCategories = categories
        .filter(c => c && c.name && c.name.trim().length > 0)
        .map(c => {
          const item: Record<string, any> = {
            name: c.name.trim(),
            hours: Number(c.hours) || 0,
          };
          if (c.startTime) item.startTime = c.startTime;
          if (c.endTime) item.endTime = c.endTime;
          return item;
        });
      if (validCategories.length > 0) {
        cleanEntry.categories = validCategories;
      }
    }

    const newWorkdays = {
      ...workdays,
      [dateString]: cleanEntry,
    };
    setWorkdays(newWorkdays);

    const newCategoriesNames = categories?.map(c => c.name.trim()).filter(name => name && !savedCategories.includes(name)) || [];
    let updatedCategories = savedCategories;
    if (newCategoriesNames.length > 0) {
      updatedCategories = [...savedCategories, ...newCategoriesNames];
      setSavedCategories(updatedCategories);
    }

    // Always immediately persist to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("workdays", JSON.stringify(newWorkdays));
        localStorage.setItem("savedCategories", JSON.stringify(updatedCategories));
      } catch (e) {
        console.error("Local storage save error:", e);
      }
    }

    if (!db) {
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef, 
        { 
          workdays: { [dateString]: cleanEntry }, 
          savedCategories: updatedCategories 
        }, 
        { merge: true }
      );
    } catch (error) {
      console.error("Firestore save error:", error);
      // Keep optimistic workdays in state and localStorage so the user never loses their data!
      toast({
        title: "Збережено на пристрої",
        description: "Відмітка збережена локально (помилка синхронізації з хмарою).",
      });
    }
  };
  
  const handleRemoveWorkday = async (date: Date) => {
    if (!user) return;
    const dateString = format(date, 'yyyy-MM-dd');
    
    const newWorkdays = { ...workdays };
    delete newWorkdays[dateString];
    setWorkdays(newWorkdays);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("workdays", JSON.stringify(newWorkdays));
      } catch (e) {
        console.error("Local storage delete error:", e);
      }
    }

    if (!db) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        [`workdays.${dateString}`]: deleteField()
      });
    } catch (error) {
      console.error("Firestore delete error:", error);
    }
  };

  const handleDeleteSavedCategory = async (categoryToDelete: string) => {
    if (!user) return;
    const updated = savedCategories.filter(c => c !== categoryToDelete);
    setSavedCategories(updated);

    const updatedRates = { ...categoryRates };
    delete updatedRates[categoryToDelete];
    setCategoryRates(updatedRates);

    if (!db) {
      if (typeof window !== "undefined") {
        localStorage.setItem("savedCategories", JSON.stringify(updated));
        localStorage.setItem("categoryRates", JSON.stringify(updatedRates));
      }
      toast({
        title: "Категорію видалено",
        description: `Категорію "${categoryToDelete}" видалено зі списку.`,
      });
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        savedCategories: updated,
        [`categoryRates.${categoryToDelete}`]: deleteField(),
      });
      toast({
        title: "Категорію видалено",
        description: `Категорію "${categoryToDelete}" видалено зі списку.`,
      });
    } catch (error) {
      console.error("Delete category error:", error);
      toast({
        variant: "destructive",
        title: "Помилка видалення",
        description: "Не вдалося видалити категорію з бази даних.",
      });
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    signOutGuest?.();
    router.push("/login");
  };

  if (loading || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <HomeIcon className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-4">
          <HomeIcon className="h-6 w-6 text-primary" />
          <h1 className="font-headline text-xl font-semibold text-foreground">Workday Compass</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.email ? user.email[0].toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Вийти</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-5 xl:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <WorkdayForm 
              selectedDate={selectedDate}
              workdays={workdays}
              savedCategories={savedCategories}
              onDeleteSavedCategory={handleDeleteSavedCategory}
              onSave={handleSaveWorkday}
              onRemove={handleRemoveWorkday}
              onDateChange={setSelectedDate}
            />
            <TotalsSummary 
              workdays={workdays} 
              currentMonth={currentMonth} 
              hourlyRate={hourlyRate}
              onHourlyRateChange={handleHourlyRateChange}
              savedCategories={savedCategories}
              categoryRates={categoryRates}
              onCategoryRateChange={handleCategoryRateChange}
            />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-3">
            <WorkdayCalendar
              workdays={workdays} 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
            <WorkdayReport
              workdays={workdays}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onSelectDate={setSelectedDate}
              hourlyRate={hourlyRate}
              categoryRates={categoryRates}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
