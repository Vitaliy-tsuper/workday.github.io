"use client"

import * as React from "react"
import { ChevronDown, Check, Trash2, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type CategoryComboboxProps = {
  value: string
  onChange: (value: string) => void
  savedCategories: string[]
  onDeleteCategory?: (category: string) => void
  placeholder?: string
  className?: string
}

export function CategoryCombobox({
  value,
  onChange,
  savedCategories,
  onDeleteCategory,
  placeholder = "Назва проєкту / категорії",
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filteredCategories = React.useMemo(() => {
    if (!value || value.trim() === "") return savedCategories
    const query = value.toLowerCase().trim()
    return savedCategories.filter((cat) => cat.toLowerCase().includes(query))
  }, [savedCategories, value])

  const handleDelete = (e: React.MouseEvent, cat: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (onDeleteCategory) {
      onDeleteCategory(cat)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative flex items-center w-full", className)}>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          className="h-8 text-xs pr-8 bg-background"
          onChange={(e) => {
            onChange(e.target.value)
            if (!open && savedCategories.length > 0) {
              setOpen(true)
            }
          }}
          onFocus={() => {
            if (savedCategories.length > 0) {
              setOpen(true)
            }
          }}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
            <span className="sr-only">Відкрити список категорій</span>
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        align="start"
        className="w-[280px] p-1.5 shadow-lg max-h-60 overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between border-b border-border/50 mb-1">
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-primary" />
            Збережені категорії
          </span>
          <span className="text-[10px] opacity-70">
            {savedCategories.length} {savedCategories.length === 1 ? "категорія" : "категорій"}
          </span>
        </div>

        {savedCategories.length === 0 ? (
          <div className="py-3 px-2 text-center text-xs text-muted-foreground">
            Немає збережених категорій.
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              Введіть назву в поле, вона збережеться автоматично.
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-2.5 px-2 text-center text-xs text-muted-foreground">
            Схожих категорій не знайдено.
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              Буде створено нову категорію &quot;{value}&quot;
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredCategories.map((cat) => {
              const isSelected = value.trim().toLowerCase() === cat.trim().toLowerCase()

              return (
                <div
                  key={cat}
                  className={cn(
                    "group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                  onClick={() => {
                    onChange(cat)
                    setOpen(false)
                    inputRef.current?.focus()
                  }}
                >
                  <span className="flex items-center gap-2 flex-1 truncate mr-2">
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <span className="truncate">{cat}</span>
                  </span>

                  {onDeleteCategory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={`Видалити "${cat}"`}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/15 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, cat)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Видалити категорію {cat}</span>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
