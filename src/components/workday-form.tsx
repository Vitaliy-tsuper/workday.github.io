"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { z } from "zod"
import { format, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { Calendar as CalendarIcon, Check, Trash2, Clock, Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  type WorkdayData, 
  type CategoryHours, 
  calculateHoursFromInterval, 
  formatHoursAndMinutes 
} from "@/lib/dates"
import { useToast } from "@/hooks/use-toast"
import { CategoryCombobox } from "@/components/category-combobox"

const formSchema = z.object({
  date: z.date({
    required_error: "Дата є обов'язковою.",
  }),
  startTime: z.string().min(1, "Оберіть час початку"),
  endTime: z.string().min(1, "Оберіть час закінчення"),
  categories: z.array(z.object({
    name: z.string().min(1, "Введіть назву"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.coerce.number().min(0.1, "Більше 0").max(24, "Максимум 24 год")
  })).default([]),
}).superRefine((data, ctx) => {
  const totalHours = calculateHoursFromInterval(data.startTime, data.endTime)
  if (totalHours <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Тривалість проміжку має бути більшою за 0",
      path: ["endTime"],
    })
  }
  if (data.categories && data.categories.length > 0) {
    const totalCat = data.categories.reduce((sum, cat) => sum + cat.hours, 0)
    if (totalCat > totalHours + 0.05) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Сума годин категорій (${totalCat} год) перевищує загальний робочий час (${totalHours} год)`,
        path: ["endTime"],
      })
    }
  }
})

type WorkdayFormProps = {
  selectedDate: Date
  workdays: WorkdayData
  savedCategories?: string[]
  onDeleteSavedCategory?: (category: string) => void
  onSave: (
    date: Date, 
    hours: number, 
    categories?: CategoryHours[],
    interval?: { startTime: string; endTime: string }
  ) => void
  onRemove: (date: Date) => void
  onDateChange: (date: Date) => void
}

export function WorkdayForm({ 
  selectedDate, 
  workdays, 
  savedCategories = [], 
  onDeleteSavedCategory,
  onSave, 
  onRemove, 
  onDateChange 
}: WorkdayFormProps) {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: selectedDate,
      startTime: "09:00",
      endTime: "17:00",
      categories: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "categories",
  })

  const watchedCategories = useWatch({
    control: form.control,
    name: "categories",
  }) || []

  const dateIsValid = selectedDate && isValid(selectedDate)
  const dateString = dateIsValid ? format(selectedDate, 'yyyy-MM-dd') : ""
  const entry = dateIsValid ? workdays[dateString] : undefined
  
  const isWorkday = entry !== undefined && (typeof entry === 'object' ? entry.worked : !!entry)

  // Sync form when selected date or workday changes
  React.useEffect(() => {
    if (dateIsValid) {
      form.setValue("date", selectedDate)
      if (isWorkday && typeof entry === 'object') {
        const start = entry.startTime || "09:00"
        let end = entry.endTime
        if (!end) {
          const [sH, sM] = start.split(":").map(Number)
          const totalMin = (sH * 60 + sM) + Math.round((entry.hours || 8) * 60)
          const endH = Math.floor(totalMin / 60) % 24
          const endM = totalMin % 60
          end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
        }
        form.setValue("startTime", start)
        form.setValue("endTime", end)
        form.setValue("categories", entry.categories || [])
      } else {
        form.setValue("startTime", "09:00")
        form.setValue("endTime", "17:00")
        form.setValue("categories", [])
      }
    }
  }, [selectedDate, dateIsValid, isWorkday, entry, form])

  const watchStart = form.watch("startTime")
  const watchEnd = form.watch("endTime")

  const calculatedHours = React.useMemo(() => {
    return calculateHoursFromInterval(watchStart, watchEnd)
  }, [watchStart, watchEnd])

  // Automatically calculate category hours when start or end time changes
  const handleCategoryTimeChange = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    form.setValue(`categories.${index}.${field}`, value, {
      shouldDirty: true,
      shouldValidate: true,
    })

    const currentStart = field === "startTime" ? value : form.getValues(`categories.${index}.startTime`)
    const currentEnd = field === "endTime" ? value : form.getValues(`categories.${index}.endTime`)

    if (currentStart && currentEnd) {
      const calculated = calculateHoursFromInterval(currentStart, currentEnd)
      if (calculated > 0) {
        form.setValue(`categories.${index}.hours`, calculated, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    }
  }

  // Set category time interval to match full shift
  const handleApplyFullShiftToCategory = (index: number) => {
    const s = form.getValues("startTime") || "09:00"
    const e = form.getValues("endTime") || "17:00"
    form.setValue(`categories.${index}.startTime`, s, { shouldDirty: true })
    form.setValue(`categories.${index}.endTime`, e, { shouldDirty: true })
    const calculated = calculateHoursFromInterval(s, e)
    if (calculated > 0) {
      form.setValue(`categories.${index}.hours`, calculated, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  // Add new category with precalculated interval & hours
  const handleAddCategory = () => {
    const currentCats = form.getValues("categories") || []
    let defaultStart = watchStart || "09:00"
    let defaultEnd = watchEnd || "17:00"

    if (currentCats.length > 0) {
      const lastCat = currentCats[currentCats.length - 1]
      if (lastCat.endTime && lastCat.endTime !== watchEnd) {
        defaultStart = lastCat.endTime
      }
    }

    const calculated = calculateHoursFromInterval(defaultStart, defaultEnd)
    const initialHours = calculated > 0 ? calculated : (calculatedHours > 0 ? calculatedHours : 4)

    append({
      name: "",
      startTime: defaultStart,
      endTime: defaultEnd,
      hours: initialHours,
    })
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!dateIsValid) return
    const hours = calculateHoursFromInterval(values.startTime, values.endTime)
    
    onSave(
      values.date, 
      hours, 
      values.categories.length > 0 ? values.categories : undefined,
      {
        startTime: values.startTime,
        endTime: values.endTime,
      }
    )

    toast({
      title: "Збережено!",
      description: `День ${format(values.date, "PPP", { locale: uk })} відмічено: ${values.startTime} — ${values.endTime} (${formatHoursAndMinutes(hours)}).`,
    })
  }
  
  function handleRemoveMark(e: React.MouseEvent) {
    e.preventDefault()
    if (!dateIsValid) return
    onRemove(selectedDate)
    toast({
      title: "Видалено!",
      description: `Відмітку для ${format(selectedDate, "PPP", { locale: uk })} видалено.`,
      variant: "destructive"
    })
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-lg">Відмітити робочий день</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs text-muted-foreground">Дата</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value && isValid(field.value) ? (
                            format(field.value, "PPP", { locale: uk })
                          ) : (
                            <span>Оберіть дату</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        locale={uk}
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date)
                            onDateChange(date)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Interval Selector */}
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Робочий проміжок</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {formatHoursAndMinutes(calculatedHours)}
                </span>
              </div>

              {/* Start & End Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Початок роботи</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="bg-card text-center font-medium" 
                          {...field} 
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val)
                            const currentCats = form.getValues("categories") || []
                            if (currentCats.length === 1) {
                              handleCategoryTimeChange(0, "startTime", val)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Кінець роботи</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="bg-card text-center font-medium" 
                          {...field} 
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val)
                            const currentCats = form.getValues("categories") || []
                            if (currentCats.length === 1) {
                              handleCategoryTimeChange(0, "endTime", val)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Categories section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-sm font-medium">Категорії / Проєкти</FormLabel>
                  <p className="text-[11px] text-muted-foreground">Години обчислюються автоматично з проміжку часу</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleAddCategory}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Додати категорію
                </Button>
              </div>
              
              {fields.map((field, index) => {
                const cat = watchedCategories[index] || {}
                const catHours = cat.hours || 0
                const catStart = cat.startTime || ""
                const catEnd = cat.endTime || ""

                return (
                  <div key={field.id} className="rounded-lg border bg-card p-3 space-y-2.5 shadow-sm">
                    {/* Category Selector / Input */}
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`categories.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <CategoryCombobox 
                                value={field.value || ""} 
                                onChange={field.onChange}
                                savedCategories={savedCategories}
                                onDeleteCategory={onDeleteSavedCategory}
                                placeholder="Назва проєкту (напр. Проєкт А)" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        title="Видалити категорію"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Time interval and calculated hours */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                      {/* Time interval pickers */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-[210px]">
                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Проміжок:</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="time"
                            className="h-7 text-xs px-1.5 text-center w-[74px] bg-background font-medium"
                            value={catStart}
                            onChange={(e) => handleCategoryTimeChange(index, "startTime", e.target.value)}
                            title="Час початку в цій категорії"
                          />
                          <span className="text-muted-foreground text-[11px]">—</span>
                          <Input
                            type="time"
                            className="h-7 text-xs px-1.5 text-center w-[74px] bg-background font-medium"
                            value={catEnd}
                            onChange={(e) => handleCategoryTimeChange(index, "endTime", e.target.value)}
                            title="Час закінчення в цій категорії"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => handleApplyFullShiftToCategory(index)}
                          title="Встановити час повної зміни"
                        >
                          Вся зміна
                        </Button>
                      </div>

                      {/* Calculated Hours Input & Formatted badge */}
                      <div className="flex items-center gap-1.5">
                        <FormField
                          control={form.control}
                          name={`categories.${index}.hours`}
                          render={({ field }) => (
                            <FormItem className="w-16">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="any" 
                                  min="0"
                                  max="24"
                                  placeholder="Год" 
                                  className="h-7 text-xs px-1 text-center font-bold text-foreground bg-background" 
                                  {...field} 
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === "" ? "" : parseFloat(val) || 0);
                                  }}
                                  title="Кількість годин (обчислюється автоматично)"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-xs font-medium text-muted-foreground">год</span>
                        {catHours > 0 && (
                          <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {formatHoursAndMinutes(catHours)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" className="w-full" disabled={!dateIsValid}>
                <Check className="mr-2 h-4 w-4" />
                {isWorkday ? "Оновити відмітку" : "Відмітити робочим"}
              </Button>
              {isWorkday && (
                 <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleRemoveMark} 
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Прибрати відмітку
                 </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
