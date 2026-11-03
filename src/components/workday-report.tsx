"use client";

import * as React from "react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { uk } from "date-fns/locale";
import { 
  FileText, 
  Printer, 
  Copy, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar,
  Check,
  ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatHoursAndMinutes, type WorkdayData, type WorkdayEntry } from "@/lib/dates";

type WorkdayReportProps = {
  workdays: WorkdayData;
  currentMonth: Date;
  onMonthChange?: (month: Date) => void;
  onSelectDate?: (date: Date) => void;
  hourlyRate?: number;
  categoryRates?: Record<string, number>;
};

type ReportRow = {
  dateStr: string;
  dateObj: Date;
  formattedDate: string;
  dayOfWeek: string;
  timeText: string;
  hours: number;
  hoursText: string;
  categoriesText?: string;
  earnings?: number;
};

export function WorkdayReport({
  workdays,
  currentMonth,
  onMonthChange,
  onSelectDate,
  hourlyRate = 100,
  categoryRates = {},
}: WorkdayReportProps) {
  const { toast } = useToast();
  const [period, setPeriod] = React.useState<"month" | "all">("month");
  const [sortAsc, setSortAsc] = React.useState<boolean>(true);
  const [isCopied, setIsCopied] = React.useState<boolean>(false);

  // Month navigation
  const handlePrevMonth = () => {
    if (onMonthChange) {
      onMonthChange(subMonths(currentMonth, 1));
    }
  };

  const handleNextMonth = () => {
    if (onMonthChange) {
      onMonthChange(addMonths(currentMonth, 1));
    }
  };

  const monthName = format(currentMonth, "LLLL yyyy", { locale: uk });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Parse and filter rows
  const rows: ReportRow[] = React.useMemo(() => {
    const monthInterval = {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    };

    const result: ReportRow[] = [];

    Object.entries(workdays).forEach(([dateStr, entry]) => {
      if (!entry) return;
      const isWorked = typeof entry === "object" ? !!entry.worked : !!entry;
      if (!isWorked) return;

      try {
        const [year, month, day] = dateStr.split("-").map(Number);
        if (!year || !month || !day) return;
        const dateObj = new Date(year, month - 1, day);

        if (period === "month") {
          if (!isWithinInterval(dateObj, monthInterval)) {
            return;
          }
        }

        const entryObj: WorkdayEntry = typeof entry === "object" ? entry : { worked: true, hours: 8 };
        const hours = entryObj.hours !== undefined ? entryObj.hours : 8;

        let timeText = "—";
        if (entryObj.startTime && entryObj.endTime) {
          timeText = `${entryObj.startTime} — ${entryObj.endTime}`;
        } else if (entryObj.startTime) {
          timeText = `від ${entryObj.startTime}`;
        } else {
          timeText = `${hours} год зміна`;
        }

        let categoriesText = "";
        let earnings = 0;
        if (entryObj.categories && entryObj.categories.length > 0) {
          categoriesText = entryObj.categories
            .map((c) => `${c.name}: ${c.hours} год`)
            .join(", ");

          let catHoursTotal = 0;
          entryObj.categories.forEach((cat) => {
            const catRate = categoryRates[cat.name] !== undefined ? categoryRates[cat.name] : hourlyRate;
            earnings += cat.hours * catRate;
            catHoursTotal += cat.hours;
          });
          const remainingHours = hours - catHoursTotal;
          if (remainingHours > 0) {
            earnings += remainingHours * hourlyRate;
          }
        } else {
          earnings = hours * hourlyRate;
        }

        result.push({
          dateStr,
          dateObj,
          formattedDate: format(dateObj, "dd.MM.yyyy", { locale: uk }),
          dayOfWeek: format(dateObj, "EEEE", { locale: uk }),
          timeText,
          hours,
          hoursText: formatHoursAndMinutes(hours),
          categoriesText,
          earnings,
        });
      } catch (err) {
        console.error("Error processing workday entry:", dateStr, err);
      }
    });

    result.sort((a, b) => {
      const cmp = a.dateStr.localeCompare(b.dateStr);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [workdays, currentMonth, period, sortAsc, hourlyRate, categoryRates]);

  // Totals calculations
  const totalDays = rows.length;
  const totalHours = React.useMemo(() => {
    const sum = rows.reduce((acc, row) => acc + row.hours, 0);
    return Math.round(sum * 100) / 100;
  }, [rows]);

  const totalEarnings = React.useMemo(() => {
    return rows.reduce((acc, row) => acc + (row.earnings || 0), 0);
  }, [rows]);

  // Copy report as plain text table
  const handleCopyText = async () => {
    if (rows.length === 0) {
      toast({
        title: "Немає даних",
        description: "У звіті немає записів для копіювання.",
      });
      return;
    }

    const title = period === "month" ? `Звіт за ${capitalizedMonthName}` : "Звіт за весь час";
    let text = `${title}\n`;
    text += "---------------------------------------------------------\n";
    text += "Дата          | Час                 | К-сть годин\n";
    text += "---------------------------------------------------------\n";

    rows.forEach((r) => {
      const datePart = `${r.formattedDate} (${r.dayOfWeek.slice(0, 2)})`.padEnd(14, " ");
      const timePart = r.timeText.padEnd(20, " ");
      const hoursPart = r.hoursText;
      text += `${datePart}| ${timePart}| ${hoursPart}\n`;
    });

    text += "---------------------------------------------------------\n";
    text += `ПІДСУМОК:\n`;
    text += `• Робочих днів: ${totalDays}\n`;
    text += `• Загальна кількість годин: ${formatHoursAndMinutes(totalHours)} (${totalHours} год)\n`;
    if (totalEarnings > 0) {
      text += `• Заробіток: ${Math.round(totalEarnings).toLocaleString("uk-UA")} ₴\n`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Скопійовано!",
        description: "Текст звіту скопійовано в буфер обміну.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Помилка копіювання",
        description: "Не вдалося скопіювати текст.",
      });
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast({
        title: "Немає даних",
        description: "У звіті немає записів для експорту.",
      });
      return;
    }

    const headers = ["Дата", "День тижня", "Час", "К-сть годин", "Категорії", "Сума (грн)"];
    const csvRows = [headers.map((h) => `"${h}"`).join(";")];

    rows.forEach((r) => {
      csvRows.push(
        [
          `"${r.formattedDate}"`,
          `"${r.dayOfWeek}"`,
          `"${r.timeText}"`,
          `"${r.hoursText}"`,
          `"${(r.categoriesText || "").replace(/"/g, '""')}"`,
          `"${Math.round(r.earnings || 0)}"`,
        ].join(";")
      );
    });

    // Summary row
    csvRows.push(
      [
        `"ПІДСУМОК: ${totalDays} днів"`,
        `""`,
        `""`,
        `"${formatHoursAndMinutes(totalHours)}"`,
        `""`,
        `"${Math.round(totalEarnings)}"`,
      ].join(";")
    );

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filenamePeriod = period === "month" ? format(currentMonth, "yyyy_MM") : "all_time";
    link.href = url;
    link.setAttribute("download", `zvit_workday_${filenamePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Файл завантажено",
      description: "Звіт збережено у форматі CSV для Excel.",
    });
  };

  // Print report
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Card className="shadow-lg border print:border-none print:shadow-none" id="workday-report-printable">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                Звіт по робочих днях
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Таблиця відпрацьованого часу та підсумок
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="h-8 gap-1.5 text-xs font-medium"
              title="Скопіювати звіт як текст"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? "Скопійовано" : "Копіювати"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 gap-1.5 text-xs font-medium"
              title="Завантажити у форматі CSV (Excel)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-medium"
              title="Роздрукувати звіт"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Друк</span>
            </Button>
          </div>
        </div>

        {/* Period selection & controls */}
        <div className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={period === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("month")}
              className="h-7 text-xs px-2.5 font-medium"
            >
              За місяць
            </Button>
            <Button
              variant={period === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("all")}
              className="h-7 text-xs px-2.5 font-medium"
            >
              Весь час
            </Button>
          </div>

          {period === "month" ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Попередній місяць"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold px-1 min-w-[110px] text-center">
                {capitalizedMonthName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Наступний місяць"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              Повний період
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortAsc(!sortAsc)}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground ml-auto"
            title="Змінити порядок сортування"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>{sortAsc ? "Спочатку старі" : "Спочатку нові"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Немає робочих днів за цей період</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {period === "month"
                ? `У ${capitalizedMonthName} ще немає збережених відміток. Оберіть день у календарі, щоб зафіксувати відпрацьований час.`
                : "Ще немає жодного відміченого робочого дня. Оберіть дату в календарі вище."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[170px] font-semibold text-foreground text-xs uppercase tracking-wider py-3">
                    Дата
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider py-3">
                    Час
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground text-xs uppercase tracking-wider py-3 pr-4">
                    К-сть годин
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.dateStr}
                    onClick={() => onSelectDate?.(row.dateObj)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    title="Натисніть для вибору цієї дати"
                  >
                    <TableCell className="py-2.5 font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {row.formattedDate}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {row.dayOfWeek}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{row.timeText}</span>
                        </div>
                        {row.categoriesText && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {row.categoriesText}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5 pr-4">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-primary">
                          {row.hoursText}
                        </span>
                        {row.earnings !== undefined && row.earnings > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {Math.round(row.earnings).toLocaleString("uk-UA")} ₴
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted/70 font-semibold border-t-2 border-border/80">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="py-4 pl-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                        Підсумок:
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground font-normal">
                        <span>
                          Робочих днів: <strong className="text-foreground font-bold">{totalDays}</strong>
                        </span>
                        {totalEarnings > 0 && (
                          <span>
                            • Заробіток:{" "}
                            <strong className="text-accent font-bold">
                              {Math.round(totalEarnings).toLocaleString("uk-UA")} ₴
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-4">
                    <span className="text-base font-extrabold text-primary">
                      {formatHoursAndMinutes(totalHours)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
