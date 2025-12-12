import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 romna-glow-primary",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary/5",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        teal: "bg-accent text-accent-foreground shadow-md hover:bg-accent/90 romna-glow-teal",
        gold: "bg-[#F3C96B] text-[#0C0D0F] shadow-md hover:bg-[#F3C96B]/90",
      },
      size: {
        default: "h-11 px-6 py-2 text-sm rounded-[14px]",
        sm: "h-9 px-4 text-xs rounded-[12px]",
        lg: "h-12 px-8 text-base rounded-[14px]",
        xl: "h-14 px-10 text-lg rounded-[16px]",
        icon: "size-11 rounded-[14px]",
        "icon-sm": "size-9 rounded-[12px]",
        "icon-lg": "size-14 rounded-[16px]",
        "icon-xl": "size-20 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
