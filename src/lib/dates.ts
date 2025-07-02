
import {
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';

export type WorkdayData = Record<string, boolean | undefined>;

const getCurrentWeekInterval = (today: Date) => {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  return { start: weekStart, end: weekEnd };
};

const getCurrentMonthInterval = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return { start: monthStart, end: monthEnd };
};

const calculateWorkedDays = (workdays: WorkdayData, interval: { start: Date, end: Date }): number => {
  return Object.entries(workdays).reduce((total, [dateStr, isWorked]) => {
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

export const calculateWeeklyDays = (workdays: WorkdayData): number => {
  const today = new Date();
  const interval = getCurrentWeekInterval(today);
  return calculateWorkedDays(workdays, interval);
};

export const calculateMonthlyDays = (workdays: WorkdayData, date: Date): number => {
  const interval = getCurrentMonthInterval(date);
  return calculateWorkedDays(workdays, interval);
}

export const calculateMonthlyEarnings = (workdays: WorkdayData, date: Date, dailyRate: number): number => {
  const workedDays = calculateMonthlyDays(workdays, date);
  return workedDays * dailyRate;
};

export const calculateTotalEarnings = (workdays: WorkdayData, dailyRate: number): number => {
    const totalWorkedDays = Object.values(workdays).filter(Boolean).length;
    return totalWorkedDays * dailyRate;
};
