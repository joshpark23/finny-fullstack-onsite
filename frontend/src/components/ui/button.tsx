import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default'
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2',
        icon: 'size-9',
        sm: 'h-8 rounded-md px-3'
      },
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent'
      }
    }
  }
)

function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      className={cn(buttonVariants({ size, variant }), className)}
      data-slot="button"
      {...props}
    />
  )
}

export { Button, buttonVariants }
