import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "romna-input h-12 w-full min-w-0",
        "file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

function FloatingInput({ 
  className, 
  label,
  type,
  id,
  ...props 
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        placeholder=" "
        data-slot="input"
        className={cn(
          "romna-input h-14 w-full pt-5 peer",
          className
        )}
        {...props}
      />
      <label 
        htmlFor={id}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-all duration-200 peer-focus:-top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1 peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
      >
        {label}
      </label>
    </div>
  )
}

export { Input, FloatingInput }
