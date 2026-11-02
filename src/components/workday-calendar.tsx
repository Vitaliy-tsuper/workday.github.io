"use client";

import * as React from "react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import type { WorkdayData } from "@/lib/dates"

type WorkdayCalendarProps = {
  workdays: WorkdayData;
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
};

export function WorkdayCalendar({ 
  workdays, 
  selectedDate, 
  onDateSelect,
  currentMonth,
  onMonthChange 
}: WorkdayCalendarProps) {

  const isDayRecorded = React.useCallback((date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayEntry = workdays[dateString];
    if (!dayEntry) return false;
    if (typeof dayEntry === 'object') {
      return dayEntry.worked !== false && (dayEntry.hours > 0 || !!dayEntry.startTime);
    }
    return !!dayEntry;
  }, [workdays]);

  const footer = selectedDate ? (() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const dayEntry = workdays[dateString];
    const isWorked = dayEntry !== undefined && (typeof dayEntry === 'object' ? dayEntry.worked : !!dayEntry);

    if (isWorked && typeof dayEntry === 'object') {
      const intervalStr = dayEntry.startTime && dayEntry.endTime ? `${dayEntry.startTime} — ${dayEntry.endTime}` : null;
      return (
        <div className="px-4 pt-2 text-sm space-y-0.5">
          <p className="font-medium text-foreground">
            Вибрано: {format(selectedDate, 'PPP', { locale: uk })}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Робочий день: {intervalStr ? `${intervalStr} • ` : ''}
            {dayEntry.hours} год
          </p>
        </div>
      );
    }

    return (
      <p className="px-4 pt-2 text-sm text-muted-foreground">
        Вибрано: {format(selectedDate, 'PPP', { locale: uk })} (не відмічено)
      </p>
    );
  })() : (
    <p className="px-4 pt-2 text-sm text-muted-foreground">Оберіть день для відмітки.</p>
  );

  return (
    <Card className="shadow-lg">
      <CardContent className="p-2 md:p-4">
        <Calendar
          locale={uk}
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={currentMonth}
          onMonthChange={onMonthChange}
          modifiers={{ recorded: isDayRecorded }}
          modifiersClassNames={{
            recorded: "relative font-bold bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-400/50 shadow-xs after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-emerald-600 dark:after:bg-emerald-400 after:rounded-full",
            selected: "bg-primary text-primary-foreground font-bold shadow-sm",
          }}
          className="w-full"
          footer={footer}
        />
      </CardContent>
    </Card>
  )
}
