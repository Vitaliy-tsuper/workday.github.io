
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format, formatISO, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { Calendar as CalendarIcon, Check, Trash2, Clock } from "lucide-react"

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
import type { WorkdayData } from "@/lib/dates"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  date: z.date({
    required_error: "Дата є обов'язковою.",
  }),
  hours: z.coerce.number().min(0.5, "Мінімум 0.5 год").max(24, "Максимум 24 год"),
})

type WorkdayFormProps = {
  selectedDate: Date;
  workdays: WorkdayData;
  onSave: (date: Date, hours: number) => void;
  onRemove: (date: Date) => void;
  onDateChange: (date: Date) => void;
}

export function WorkdayForm({ selectedDate, workdays, onSave, onRemove, onDateChange }: WorkdayFormProps) {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: selectedDate,
      hours: 8,
    },
  })

  const dateIsValid = selectedDate && isValid(selectedDate);
  const dateString = dateIsValid ? formatISO(selectedDate, { representation: 'date' }) : ""
  const entry = dateIsValid ? workdays[dateString] : undefined;
  
  const isWorkday = entry !== undefined && (typeof entry === 'object' ? entry.worked : !!entry);

  React.useEffect(() => {
    if (dateIsValid) {
      form.setValue("date", selectedDate);
      if (isWorkday && typeof entry === 'object') {
        form.setValue("hours", entry.hours || 8);
      } else {
        form.setValue("hours", 8);
      }
    }
  }, [selectedDate, dateIsValid, isWorkday, entry, form])

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!dateIsValid) return;
    onSave(values.date, values.hours);
    toast({
      title: "Збережено!",
      description: `День ${format(values.date, "PPP", { locale: uk })} відмічено: ${values.hours} год.`,
    });
  }
  
  function handleRemoveMark(e: React.MouseEvent) {
    e.preventDefault();
    if (!dateIsValid) return;
    onRemove(selectedDate);
    toast({
      title: "Видалено!",
      description: `Відмітку для ${format(selectedDate, "PPP", { locale: uk })} видалено.`,
      variant: "destructive"
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Відмітити день</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Дата</FormLabel>
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

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Кількість годин</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="number" step="0.5" className="pl-9" {...field} />
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col gap-2 pt-2">
              {!isWorkday ? (
                <Button type="submit" className="w-full" disabled={!dateIsValid}>
                  <Check className="mr-2 h-4 w-4" />
                  Відмітити робочим
                </Button>
              ) : (
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
