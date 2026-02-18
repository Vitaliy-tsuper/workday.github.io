
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format, formatISO, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { Calendar as CalendarIcon, Check, Trash2, Banknote } from "lucide-react"

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { WorkdayData } from "@/lib/dates"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  date: z.date({
    required_error: "Дата є обов'язковою.",
  }),
  rate: z.coerce.number().min(0, "Ставка не може бути менше 0."),
})

type WorkdayFormProps = {
  selectedDate: Date;
  workdays: WorkdayData;
  onSave: (date: Date, rate: number) => void;
  onRemove: (date: Date) => void;
  onDateChange: (date: Date) => void;
  defaultDailyRate: number;
}

export function WorkdayForm({ selectedDate, workdays, onSave, onRemove, onDateChange, defaultDailyRate }: WorkdayFormProps) {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: selectedDate,
      rate: defaultDailyRate,
    },
  })

  const dateIsValid = selectedDate && isValid(selectedDate);
  const dateString = dateIsValid ? formatISO(selectedDate, { representation: 'date' }) : ""
  const existingData = workdays[dateString];
  const isWorkday = typeof existingData === 'object' ? existingData.worked : !!existingData;

  const setValue = form.setValue;
  React.useEffect(() => {
    if (dateIsValid) {
      setValue("date", selectedDate);
      
      let rateToSet = defaultDailyRate;
      if (typeof existingData === 'object' && existingData.rate !== undefined) {
        rateToSet = existingData.rate;
      }
      setValue("rate", rateToSet);
    }
  }, [selectedDate, dateIsValid, existingData, defaultDailyRate, setValue]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!dateIsValid) return;
    onSave(values.date, values.rate);
    toast({
      title: "Збережено!",
      description: `День ${format(values.date, "PPP", { locale: uk })} відмічено. Ставка: ${values.rate} грн.`,
    });
  }
  
  function handleRemoveMark() {
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ставка за цей день (грн)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="number" {...field} className="pl-9" />
                      <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={!dateIsValid}>
                <Check className="mr-2 h-4 w-4" />
                {isWorkday ? 'Оновити' : 'Відмітити робочим'}
              </Button>
              
              {isWorkday && (
                 <Button type="button" variant="outline" onClick={handleRemoveMark} disabled={!dateIsValid} className="px-3">
                    <Trash2 className="h-4 w-4 text-destructive" />
                 </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
