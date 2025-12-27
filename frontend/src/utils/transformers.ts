/**
 * Transform Salesforce describe data to React Flow nodes and edges.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  ObjectDescribe,
  ObjectNodeData,
  RelationshipEdgeData,
} from '../types/schema';

type RelationshipType = 'lookup' | 'master-detail';

/**
 * Transform Salesforce object describes to React Flow elements.
 */
export function transformToFlowElements(
  describes: ObjectDescribe[],
  selectedObjects: string[]
): { nodes: Node<ObjectNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const selectedSet = new Set(selectedObjects);
  const nodes: Node<ObjectNodeData>[] = [];
  const edges: Edge<RelationshipEdgeData>[] = [];

  // Create nodes for each described object
  for (const describe of describes) {
    nodes.push({
      id: describe.name,
      type: 'objectNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        label: describe.label,
        apiName: describe.name,
        keyPrefix: describe.key_prefix,
        isCustom: describe.custom,
        fields: describe.fields,
        collapsed: false,
      },
    });
  }

  // Create edges for relationships
  for (const describe of describes) {
    for (const field of describe.fields) {
      // Only create edges for reference fields
      if (field.type !== 'reference' || !field.reference_to?.length) {
        continue;
      }

      // Only create edges to objects that are currently selected
      for (const targetObject of field.reference_to) {
        if (!selectedSet.has(targetObject)) {
          continue;
        }

        // Determine relationship type
        const relationshipType: RelationshipType =
          field.relationship_order === 1 ? 'master-detail' : 'lookup';

        edges.push({
          id: `${describe.name}-${field.name}-${targetObject}`,
          source: describe.name,
          target: targetObject,
          type: 'simpleFloating',
          data: {
            fieldName: field.name,
            relationshipType,
            sourceObject: describe.name,
            targetObject,
            // Cardinality: many-to-one for lookups (N:1), one-to-one possible for master-detail
            sourceCardinality: 'N',
            targetCardinality: '1',
          },
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get a human-readable display for a field type.
 */
export function getFieldTypeDisplay(field: { type: string; length?: number; precision?: number; scale?: number }): string {
  switch (field.type) {
    case 'string':
    case 'textarea':
    case 'url':
    case 'email':
    case 'phone':
      return field.length ? `Text(${field.length})` : 'Text';
    case 'int':
    case 'integer':
      return 'Integer';
    case 'double':
      return field.precision && field.scale
        ? `Number(${field.precision}, ${field.scale})`
        : 'Number';
    case 'currency':
      return field.precision && field.scale
        ? `Currency(${field.precision}, ${field.scale})`
        : 'Currency';
    case 'percent':
      return 'Percent';
    case 'boolean':
      return 'Checkbox';
    case 'date':
      return 'Date';
    case 'datetime':
      return 'DateTime';
    case 'time':
      return 'Time';
    case 'reference':
      return 'Lookup';
    case 'picklist':
      return 'Picklist';
    case 'multipicklist':
      return 'Multi-Select';
    case 'id':
      return 'ID';
    case 'base64':
      return 'Base64';
    case 'address':
      return 'Address';
    case 'location':
      return 'Geolocation';
    case 'encryptedstring':
      return 'Encrypted';
    default:
      return field.type;
  }
}
