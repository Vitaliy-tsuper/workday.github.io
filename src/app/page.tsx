"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass as HomeIcon, LogOut } from "lucide-react";
import { WorkdayForm } from "@/components/workday-form";
import { TotalsSummary } from "@/components/totals-summary";
import { WorkdayCalendar } from "@/components/workday-calendar";
import type { WorkdayData } from "@/lib/dates";
import { formatISO } from "date-fns";
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [workdays, setWorkdays] = useState<WorkdayData>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dataLoading, setDataLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(100);

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
            setWorkdays(normalizedWorkdays);
            // If data.hourlyRate doesn't exist, we might try to fallback to dailyRate/8 if it existed
            if (data.hourlyRate !== undefined) {
              setHourlyRate(data.hourlyRate);
            } else if (data.dailyRate !== undefined) {
              setHourlyRate(data.dailyRate / 8);
            }
          } else {
            setWorkdays({});
            await setDoc(doc(db, "users", user.uid), { workdays: {}, hourlyRate: 100 });
            setHourlyRate(100);
          }
        } catch (error) {
          console.error("Firestore read error:", error);
          toast({
            variant: "destructive",
            title: "Помилка завантаження даних",
            description: "Не вдалося з'єднатися з базою даних.",
          });
        } finally {
          setDataLoading(false);
        }
      };
      fetchData();
    } else if (!loading) {
      setDataLoading(false);
    }
  }, [user, loading, toast]);

  const handleHourlyRateChange = async (newRate: number) => {
    if (!user || !db) return;
    setHourlyRate(newRate);
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

  const handleSaveWorkday = async (date: Date, hours: number) => {
    if (!user || !db) return;
    const dateString = formatISO(date, { representation: 'date' });
    
    const originalWorkdays = workdays;
    const entry = { worked: true, hours };
    const newWorkdays = {
      ...workdays,
      [dateString]: entry,
    };
    setWorkdays(newWorkdays);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { workdays: { [dateString]: entry } }, { merge: true });
    } catch (error) {
      setWorkdays(originalWorkdays);
      toast({
          variant: "destructive",
          title: "Помилка збереження",
          description: "Спробуйте ще раз.",
      });
    }
  };
  
  const handleRemoveWorkday = async (date: Date) => {
    if (!user || !db) return;
    const dateString = formatISO(date, { representation: 'date' });
    
    const originalWorkdays = workdays;
    const newWorkdays = {...workdays};
    delete newWorkdays[dateString];
    setWorkdays(newWorkdays);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        [`workdays.${dateString}`]: deleteField()
      });
    } catch (error) {
      setWorkdays(originalWorkdays);
      toast({
          variant: "destructive",
          title: "Помилка видалення",
          description: "Не вдалося видалити відмітку.",
      });
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
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
              onSave={handleSaveWorkday}
              onRemove={handleRemoveWorkday}
              onDateChange={setSelectedDate}
            />
            <TotalsSummary 
              workdays={workdays} 
              currentMonth={currentMonth} 
              hourlyRate={hourlyRate}
              onHourlyRateChange={handleHourlyRateChange}
            />
          </div>
          <div className="lg:col-span-3">
            <WorkdayCalendar
                workdays={workdays} 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
