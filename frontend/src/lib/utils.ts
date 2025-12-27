import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Link,
  List,
  FileText,
  Mail,
  Phone,
  Globe,
  Percent,
  DollarSign,
  Clock,
  MapPin,
  Binary,
  Key,
  CircleDot,
} from 'lucide-react'
import { createElement } from 'react'

/**
 * Utility function to merge Tailwind CSS classes.
 * Combines clsx for conditional classes with tailwind-merge
 * to properly handle conflicting Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps Salesforce field types to Lucide React icons.
 * Returns a React element for the appropriate icon.
 */
export function getFieldTypeIcon(fieldType: string) {
  const iconClass = 'h-3.5 w-3.5'
  const type = fieldType.toLowerCase()

  const iconMap: Record<string, typeof Type> = {
    // Text types
    string: Type,
    textarea: FileText,
    encryptedstring: Key,
    // Number types
    int: Hash,
    integer: Hash,
    double: Hash,
    currency: DollarSign,
    percent: Percent,
    // Date/time types
    date: Calendar,
    datetime: Clock,
    time: Clock,
    // Boolean
    boolean: ToggleLeft,
    // Reference types
    reference: Link,
    masterrecord: Link,
    // Picklist types
    picklist: List,
    multipicklist: List,
    combobox: List,
    // Contact info
    email: Mail,
    phone: Phone,
    url: Globe,
    // Location
    address: MapPin,
    location: MapPin,
    // Special types
    id: Key,
    base64: Binary,
  }

  const IconComponent = iconMap[type] || CircleDot
  return createElement(IconComponent, { className: iconClass })
}
