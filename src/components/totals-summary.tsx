
"use client"

import * as React from 'react'
import { Wallet, CalendarDays, Save, History, Clock, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { calculateMonthlyDays, calculateMonthlyEarnings, calculateTotalDays, calculateMonthlyHours, calculateTotalHours, calculateMonthlyCategoryHours } from '@/lib/dates'
import type { WorkdayData } from '@/lib/dates'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Separator } from './ui/separator'

type TotalsSummaryProps = {
  workdays: WorkdayData;
  currentMonth: Date;
  hourlyRate: number;
  onHourlyRateChange: (rate: number) => Promise<void>;
  savedCategories?: string[];
  categoryRates?: Record<string, number>;
  onCategoryRateChange?: (category: string, rate: number) => Promise<void>;
}

export function TotalsSummary({ workdays, currentMonth, hourlyRate, onHourlyRateChange, savedCategories = [], categoryRates = {}, onCategoryRateChange }: TotalsSummaryProps) {
  const { toast } = useToast();
  const [localRate, setLocalRate] = React.useState(hourlyRate.toString());
  const [localCategoryRates, setLocalCategoryRates] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setLocalRate(hourlyRate.toString());
  }, [hourlyRate]);

  React.useEffect(() => {
    const stringifiedRates: Record<string, string> = {};
    Object.entries(categoryRates).forEach(([cat, rate]) => {
      stringifiedRates[cat] = rate.toString();
    });
    setLocalCategoryRates(stringifiedRates);
  }, [categoryRates]);

  const monthlyDays = React.useMemo(() => calculateMonthlyDays(workdays, currentMonth), [workdays, currentMonth]);
  const monthlyHours = React.useMemo(() => calculateMonthlyHours(workdays, currentMonth), [workdays, currentMonth]);
  const monthlyEarnings = React.useMemo(() => calculateMonthlyEarnings(workdays, currentMonth, hourlyRate, categoryRates), [workdays, currentMonth, hourlyRate, categoryRates]);
  const monthlyCategories = React.useMemo(() => calculateMonthlyCategoryHours(workdays, currentMonth), [workdays, currentMonth]);
  
  const totalDays = React.useMemo(() => calculateTotalDays(workdays), [workdays]);
  const totalHours = React.useMemo(() => calculateTotalHours(workdays), [workdays]);

  const monthName = format(currentMonth, 'LLLL yyyy', { locale: uk });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const handleSaveRate = async () => {
    const newRate = parseFloat(localRate);
    if (isNaN(newRate) || newRate < 0) {
      toast({
        variant: "destructive",
        title: "Невірне значення",
        description: "Будь ласка, введіть додатне число.",
      });
      return;
    }
    await onHourlyRateChange(newRate);
    toast({
      title: "Збережено!",
      description: "Погодинну ставку оновлено.",
    });
  };

  const handleSaveCategoryRate = async (category: string) => {
    if (!onCategoryRateChange) return;
    const rateStr = localCategoryRates[category];
    const newRate = parseFloat(rateStr);
    if (isNaN(newRate) || newRate < 0) {
      toast({
        variant: "destructive",
        title: "Невірне значення",
        description: "Будь ласка, введіть додатне число.",
      });
      return;
    }
    await onCategoryRateChange(category, newRate);
    toast({
      title: "Збережено!",
      description: `Ставку для "${category}" оновлено.`,
    });
  };

  const hasCategories = Object.keys(monthlyCategories).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-lg">Підсумки за {capitalizedMonthName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
            <div className='flex items-center gap-3'>
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Днів</span>
            </div>
            <div className="text-base font-bold text-primary">{monthlyDays}</div>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
            <div className='flex items-center gap-3'>
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">Годин</span>
            </div>
            <div className="text-base font-bold text-orange-500">{monthlyHours}</div>
        </div>
        
        {hasCategories && (
          <div className="rounded-lg border bg-card-foreground/5 p-3 space-y-2">
            <div className='flex items-center gap-3 mb-2'>
                <PieChart className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-500">За категоріями</span>
            </div>
            {Object.entries(monthlyCategories).map(([name, hours]) => (
              <div key={name} className="flex items-center justify-between pl-7">
                  <span className="text-sm text-muted-foreground">{name}</span>
                  <span className="text-sm font-medium">{hours} год</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
            <div className='flex items-center gap-3'>
                <Wallet className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">Заробіток</span>
            </div>
          <div className="text-base font-bold text-accent">{Math.round(monthlyEarnings).toLocaleString('uk-UA')} ₴</div>
        </div>
        
        <div className="py-2 flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Весь час</span>
            <Separator className="flex-1" />
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
            <div className='flex items-center gap-3'>
                <History className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Всього днів</span>
            </div>
            <div className="text-base font-bold text-muted-foreground">{totalDays}</div>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-3">
            <div className='flex items-center gap-3'>
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Всього годин</span>
            </div>
            <div className="text-base font-bold text-muted-foreground">{totalHours}</div>
        </div>
      </CardContent>
      <Separator className="my-2" />
      <CardFooter className="pt-2 flex flex-col items-start gap-4">
        <div className="w-full space-y-2">
            <Label htmlFor="hourly-rate" className="text-xs">Стандартна ставка (грн/год)</Label>
            <div className="flex items-center gap-2">
                <Input
                    id="hourly-rate"
                    type="number"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    placeholder="Ваша ставка"
                    className="text-sm h-9"
                />
                <Button 
                  onClick={handleSaveRate} 
                  disabled={parseFloat(localRate) === hourlyRate || isNaN(parseFloat(localRate))}
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Зберегти ставку"
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {savedCategories.length > 0 && (
          <div className="w-full space-y-2">
            <Label className="text-xs">Ставки за категоріями (грн/год)</Label>
            <div className="space-y-2">
              {savedCategories.map((cat) => {
                const currentRate = categoryRates[cat];
                const localCatRate = localCategoryRates[cat] || '';
                const isChanged = localCatRate !== '' && parseFloat(localCatRate) !== currentRate && !(isNaN(parseFloat(localCatRate)) && currentRate === undefined);

                return (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-1/2 text-sm text-muted-foreground truncate" title={cat}>
                      {cat}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                          type="number"
                          value={localCatRate}
                          onChange={(e) => setLocalCategoryRates(prev => ({ ...prev, [cat]: e.target.value }))}
                          placeholder={hourlyRate.toString()}
                          className="text-sm h-8"
                      />
                      <Button 
                        onClick={() => handleSaveCategoryRate(cat)} 
                        disabled={!isChanged}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Зберегти ставку для ${cat}`}
                      >
                          <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
