
import {
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';

export type CategoryHours = {
  name: string;
  hours: number;
  startTime?: string;
  endTime?: string;
};

export type WorkdayEntry = {
  worked: boolean;
  hours: number;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  categories?: CategoryHours[];
};

export type WorkdayData = Record<string, WorkdayEntry | boolean | undefined>;

export const calculateHoursFromInterval = (
  start: string,
  end: string,
  breakMinutes: number = 0
): number => {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;

  let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (totalMinutes <= 0) {
    // Over midnight shift or 24h
    totalMinutes += 24 * 60;
  }
  totalMinutes -= (breakMinutes || 0);
  if (totalMinutes < 0) totalMinutes = 0;

  return Math.round((totalMinutes / 60) * 100) / 100;
};

export const formatHoursAndMinutes = (totalHours: number): string => {
  const wholeHours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - wholeHours) * 60);
  if (minutes === 0) {
    return `${wholeHours} год`;
  }
  return `${wholeHours} год ${minutes} хв`;
};

const getCurrentMonthInterval = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return { start: monthStart, end: monthEnd };
};

const getEntryHours = (entry: WorkdayEntry | boolean | undefined): number => {
  if (typeof entry === 'object' && entry !== null) {
    return entry.hours || 0;
  }
  return entry === true ? 8 : 0;
};

const isWorked = (entry: WorkdayEntry | boolean | undefined): boolean => {
  if (typeof entry === 'object' && entry !== null) {
    return !!entry.worked;
  }
  return !!entry;
};

export const calculateMonthlyDays = (workdays: WorkdayData, date: Date): number => {
  const interval = getCurrentMonthInterval(date);
  return Object.entries(workdays).reduce((total, [dateStr, entry]) => {
    if (!isWorked(entry)) return total;
    try {
      const dayDate = parseISO(dateStr);
      if (isWithinInterval(dayDate, interval)) {
        return total + 1;
      }
    } catch (e) {
      // Ignore invalid date strings
    }
    return total;
  }, 0);
};

export const calculateMonthlyHours = (workdays: WorkdayData, date: Date): number => {
  const interval = getCurrentMonthInterval(date);
  return Object.entries(workdays).reduce((total, [dateStr, entry]) => {
    if (!isWorked(entry)) return total;
    try {
      const dayDate = parseISO(dateStr);
      if (isWithinInterval(dayDate, interval)) {
        return total + getEntryHours(entry);
      }
    } catch (e) {
      // Ignore invalid date strings
    }
    return total;
  }, 0);
};

export const calculateMonthlyEarnings = (workdays: WorkdayData, date: Date, hourlyRate: number, categoryRates: Record<string, number> = {}): number => {
  const interval = getCurrentMonthInterval(date);
  let totalEarnings = 0;

  Object.entries(workdays).forEach(([dateStr, entry]) => {
    if (!isWorked(entry)) return;
    try {
      const dayDate = parseISO(dateStr);
      if (isWithinInterval(dayDate, interval)) {
        const hours = getEntryHours(entry);
        if (typeof entry === 'object' && entry.categories && entry.categories.length > 0) {
          let catHoursTotal = 0;
          entry.categories.forEach(cat => {
            const catRate = categoryRates[cat.name] !== undefined ? categoryRates[cat.name] : hourlyRate;
            totalEarnings += cat.hours * catRate;
            catHoursTotal += cat.hours;
          });
          const remainingHours = hours - catHoursTotal;
          if (remainingHours > 0) {
            totalEarnings += remainingHours * hourlyRate;
          }
        } else {
          totalEarnings += hours * hourlyRate;
        }
      }
    } catch (e) {
      // Ignore
    }
  });

  return totalEarnings;
};

export const calculateTotalDays = (workdays: WorkdayData): number => {
  return Object.values(workdays).filter(isWorked).length;
};

export const calculateTotalHours = (workdays: WorkdayData): number => {
  return Object.values(workdays).reduce((total, entry) => {
    if (!isWorked(entry)) return total;
    return total + getEntryHours(entry);
  }, 0);
};

export const calculateMonthlyCategoryHours = (workdays: WorkdayData, date: Date): Record<string, number> => {
  const interval = getCurrentMonthInterval(date);
  const categories: Record<string, number> = {};

  Object.entries(workdays).forEach(([dateStr, entry]) => {
    if (!isWorked(entry)) return;
    try {
      const dayDate = parseISO(dateStr);
      if (isWithinInterval(dayDate, interval)) {
        if (typeof entry === 'object' && entry.categories && entry.categories.length > 0) {
          entry.categories.forEach(cat => {
            categories[cat.name] = (categories[cat.name] || 0) + cat.hours;
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  });
  return categories;
};
