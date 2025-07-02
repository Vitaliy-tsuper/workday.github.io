"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format, formatISO, isValid } from "date-fns"
import { uk } from "date-fns/locale"
import { Calendar as CalendarIcon, Check, Trash2 } from "lucide-react"

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
import type { WorkdayData } from "@/lib/dates"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  date: z.date({
    required_error: "Дата є обов'язковою.",
  }),
})

type WorkdayFormProps = {
  selectedDate: Date;
  workdays: WorkdayData;
  onSave: (date: Date) => void;
  onRemove: (date: Date) => void;
  onDateChange: (date: Date) => void;
}

export function WorkdayForm({ selectedDate, workdays, onSave, onRemove, onDateChange }: WorkdayFormProps) {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: selectedDate,
    },
  })

  const dateIsValid = selectedDate && isValid(selectedDate);
  const dateString = dateIsValid ? formatISO(selectedDate, { representation: 'date' }) : ""
  const isWorkday = dateIsValid ? !!workdays[dateString] : false;

  React.useEffect(() => {
    if (dateIsValid) {
      form.setValue("date", selectedDate)
    }
  }, [selectedDate, form, dateIsValid])

  function handleMarkAsWorked() {
    if (!dateIsValid) return;
    onSave(selectedDate);
    toast({
      title: "Збережено!",
      description: `День ${format(selectedDate, "PPP", { locale: uk })} відмічено як робочий.`,
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
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
            
            <div className="flex items-center gap-2 pt-2">
              {isWorkday ? (
                 <Button type="button" variant="destructive" onClick={handleRemoveMark} disabled={!dateIsValid} className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Прибрати відмітку
                 </Button>
              ) : (
                <Button type="button" onClick={handleMarkAsWorked} className="flex-1" disabled={!dateIsValid}>
                  <Check className="mr-2 h-4 w-4" />
                  Відмітити робочим
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
