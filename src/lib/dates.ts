
import {
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';

export type WorkdayEntry = {
  worked: boolean;
  hours: number;
};

export type WorkdayData = Record<string, WorkdayEntry | boolean | undefined>;

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

export const calculateMonthlyEarnings = (workdays: WorkdayData, date: Date, hourlyRate: number): number => {
  return calculateMonthlyHours(workdays, date) * hourlyRate;
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
