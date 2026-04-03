"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
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

  const recordedDays = React.useMemo(() => {
    return Object.keys(workdays)
      .filter(dateStr => workdays[dateStr])
      .map(dateStr => parseISO(dateStr));
  }, [workdays]);

  const footer = selectedDate ? (
    <p className="px-4 pt-2 text-sm text-muted-foreground">
      Вибрано: {format(selectedDate, 'PPP', { locale: uk })}.
    </p>
  ) : (
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
          modifiers={{ recorded: recordedDays }}
          modifiersClassNames={{
            recorded: "bg-accent/30 text-accent-foreground font-bold",
            selected: "bg-primary text-primary-foreground",
          }}
          className="w-full"
          footer={footer}
        />
      </CardContent>
    </Card>
  )
}
