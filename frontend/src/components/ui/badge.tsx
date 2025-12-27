import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Salesforce-specific variants for object classification
        custom: 'border-transparent bg-sf-purple-light text-sf-purple text-[10px] px-1.5 py-0.5 rounded font-bold',
        standard: 'border-transparent bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        // Object type badges - each with unique colors
        feed: 'border-transparent bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        share: 'border-transparent bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        history: 'border-transparent bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        changeEvent: 'border-transparent bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        platformEvent: 'border-transparent bg-cyan-100 text-cyan-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        externalObject: 'border-transparent bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        customMetadata: 'border-transparent bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        bigObject: 'border-transparent bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        tag: 'border-transparent bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
        // Capability indicator badges (compact, icon-style)
        capability: 'border-gray-300 bg-gray-50 text-gray-600 text-[10px] px-1.5 py-0 rounded font-medium',
        capabilityActive: 'border-sf-blue/30 bg-sf-blue/10 text-sf-blue text-[10px] px-1.5 py-0 rounded font-medium',
        // Namespace badge for managed package objects
        namespace: 'border-transparent bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
