
"use client"

import * as React from 'react'
import { Wallet, CalendarDays, Banknote, Save, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { calculateMonthlyDays, calculateMonthlyEarnings, calculateTotalEarnings, calculateTotalDays } from '@/lib/dates'
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
  dailyRate: number;
  onDailyRateChange: (rate: number) => Promise<void>;
}

export function TotalsSummary({ workdays, currentMonth, dailyRate, onDailyRateChange }: TotalsSummaryProps) {
  const { toast } = useToast();
  const [localRate, setLocalRate] = React.useState(dailyRate.toString());

  React.useEffect(() => {
    setLocalRate(dailyRate.toString());
  }, [dailyRate]);

  const monthlyDays = React.useMemo(() => calculateMonthlyDays(workdays, currentMonth), [workdays, currentMonth]);
  const monthlyEarnings = React.useMemo(() => calculateMonthlyEarnings(workdays, currentMonth, dailyRate), [workdays, currentMonth, dailyRate]);
  const totalDays = React.useMemo(() => calculateTotalDays(workdays), [workdays]);
  const totalEarnings = React.useMemo(() => calculateTotalEarnings(workdays, dailyRate), [workdays, dailyRate]);

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
    await onDailyRateChange(newRate);
    toast({
      title: "Збережено!",
      description: "Денну ставку оновлено.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Підсумки за {capitalizedMonthName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-4">
            <div className='flex items-center gap-3'>
                <CalendarDays className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Днів за місяць</span>
            </div>
            <div className="text-lg font-bold text-primary">{monthlyDays} дн.</div>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-4">
            <div className='flex items-center gap-3'>
                <Wallet className="h-6 w-6 text-accent" />
                <span className="text-sm font-medium">Заробив за місяць</span>
            </div>
          <div className="text-lg font-bold text-accent">{monthlyEarnings.toLocaleString('uk-UA')} грн</div>
        </div>
        <Separator />
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-4">
            <div className='flex items-center gap-3'>
                <History className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Днів за весь час</span>
            </div>
            <div className="text-lg font-bold text-muted-foreground">{totalDays} дн.</div>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-card-foreground/5 p-4">
            <div className='flex items-center gap-3'>
                <Banknote className="h-6 w-6 text-foreground/80" />
                <span className="text-sm font-medium">Заробив за весь період</span>
            </div>
          <div className="text-lg font-bold text-foreground/90">{totalEarnings.toLocaleString('uk-UA')} грн</div>
        </div>
      </CardContent>
      <Separator className="mb-4 mt-2" />
      <CardFooter>
        <div className="w-full space-y-2">
            <Label htmlFor="daily-rate">Ваша денна ставка (грн)</Label>
            <div className="flex items-center gap-2">
                <Input
                    id="daily-rate"
                    type="number"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    placeholder="Ваша ставка"
                    className="text-base"
                />
                <Button 
                  onClick={handleSaveRate} 
                  disabled={parseFloat(localRate) === dailyRate || isNaN(parseFloat(localRate))}
                  size="icon"
                  aria-label="Зберегти ставку"
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>
  )
}
