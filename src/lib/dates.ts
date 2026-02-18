
import {
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';

export type WorkdayEntry = {
  worked: boolean;
  rate: number;
};

export type WorkdayData = Record<string, WorkdayEntry | boolean | undefined>;

const getCurrentMonthInterval = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return { start: monthStart, end: monthEnd };
};

const calculateWorkedDaysCount = (workdays: WorkdayData, interval: { start: Date, end: Date }): number => {
  return Object.entries(workdays).reduce((total, [dateStr, value]) => {
    if (!value) return total;
    const isWorked = typeof value === 'object' ? value.worked : value;
    if (!isWorked) return total;
    
    try {
      const date = parseISO(dateStr);
      if (isWithinInterval(date, interval)) {
        return total + 1;
      }
    } catch (error) {
      console.error(`Invalid date format: ${dateStr}`);
    }
    return total;
  }, 0);
};

const calculateEarnings = (workdays: WorkdayData, interval: { start: Date, end: Date }, defaultRate: number): number => {
  return Object.entries(workdays).reduce((total, [dateStr, value]) => {
    if (!value) return total;
    const isWorked = typeof value === 'object' ? value.worked : value;
    if (!isWorked) return total;

    try {
      const date = parseISO(dateStr);
      if (isWithinInterval(date, interval)) {
        const rate = (typeof value === 'object' && value.rate !== undefined) ? value.rate : defaultRate;
        return total + rate;
      }
    } catch (error) {
      console.error(`Invalid date format: ${dateStr}`);
    }
    return total;
  }, 0);
};

export const calculateMonthlyDays = (workdays: WorkdayData, date: Date): number => {
  const interval = getCurrentMonthInterval(date);
  return calculateWorkedDaysCount(workdays, interval);
}

export const calculateMonthlyEarnings = (workdays: WorkdayData, date: Date, defaultRate: number): number => {
  const interval = getCurrentMonthInterval(date);
  return calculateEarnings(workdays, interval, defaultRate);
};

export const calculateTotalDays = (workdays: WorkdayData): number => {
  return Object.values(workdays).filter(val => {
    if (typeof val === 'object') return val.worked;
    return !!val;
  }).length;
};

export const calculateTotalEarnings = (workdays: WorkdayData, defaultRate: number): number => {
  return Object.values(workdays).reduce((total, value) => {
    if (!value) return total;
    const isWorked = typeof value === 'object' ? value.worked : value;
    if (!isWorked) return total;
    
    const rate = (typeof value === 'object' && value.rate !== undefined) ? value.rate : defaultRate;
    return (total as number) + rate;
  }, 0) as number;
};
