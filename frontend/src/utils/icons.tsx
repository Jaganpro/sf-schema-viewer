import {
  Key,
  Link,
  FileText,
  CheckSquare,
  Calendar,
  Hash,
  List,
  Mail,
  Phone,
  Globe,
  File,
  type LucideIcon,
} from 'lucide-react'

export type FieldIconType = LucideIcon

/**
 * Get a Lucide icon component for a Salesforce field type.
 */
export function getFieldTypeIcon(type: string): LucideIcon {
  switch (type) {
    case 'id':
      return Key
    case 'reference':
      return Link
    case 'string':
    case 'textarea':
      return FileText
    case 'boolean':
      return CheckSquare
    case 'date':
    case 'datetime':
    case 'time':
      return Calendar
    case 'int':
    case 'double':
    case 'currency':
    case 'percent':
      return Hash
    case 'picklist':
    case 'multipicklist':
      return List
    case 'email':
      return Mail
    case 'phone':
      return Phone
    case 'url':
      return Globe
    default:
      return File
  }
}
