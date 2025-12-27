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
 * @param describes - Array of object descriptions
 * @param selectedObjects - Names of objects currently in the ERD
 * @param selectedFieldsByObject - Map of object name to selected field names (for filtering)
 * @param selectedChildRelsByParent - Map of parent object to selected child relationships (for edge filtering)
 */
export function transformToFlowElements(
  describes: ObjectDescribe[],
  selectedObjects: string[],
  selectedFieldsByObject?: Map<string, Set<string>>,
  selectedChildRelsByParent?: Map<string, Set<string>>
): { nodes: Node<ObjectNodeData>[]; edges: Edge<RelationshipEdgeData>[] } {
  const selectedSet = new Set(selectedObjects);
  const nodes: Node<ObjectNodeData>[] = [];
  const edges: Edge<RelationshipEdgeData>[] = [];

  // Create nodes for each described object
  for (const describe of describes) {
    // Filter fields based on selection - only show selected fields in node
    const selectedFields = selectedFieldsByObject?.get(describe.name);
    const filteredFields = selectedFields?.size
      ? describe.fields.filter((f) => selectedFields.has(f.name))
      : []; // Empty array if no fields selected (default: no fields)

    nodes.push({
      id: describe.name,
      type: 'objectNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        label: describe.label,
        apiName: describe.name,
        keyPrefix: describe.key_prefix,
        isCustom: describe.custom,
        fields: filteredFields,
        collapsed: false,
      },
    });
  }

  // Create edges for relationships (always use full describe, not filtered fields)
  // Edges are filtered by child relationship selection when applicable
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

        // Check if this edge should be filtered by child relationship selection
        // Relationship key format: "SourceObject.FieldName" (e.g., "Asset.AssetProvidedById")
        const relationshipKey = `${describe.name}.${field.name}`;

        // If the target object has child relationship selections, only show selected edges
        // If no selections for target (object added from main list), show all edges
        const targetChildRels = selectedChildRelsByParent?.get(targetObject);
        if (targetChildRels && targetChildRels.size > 0) {
          // Target has child relationship selections - only show if this edge was selected
          if (!targetChildRels.has(relationshipKey)) {
            continue; // Skip this edge - it wasn't explicitly selected
          }
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

  // Group edges by source-target pair to add index info for offset calculation
  // This allows multiple edges between the same nodes to fan out visually
  const edgeGroups = new Map<string, Edge<RelationshipEdgeData>[]>();
  for (const edge of edges) {
    const groupKey = `${edge.source}-${edge.target}`;
    if (!edgeGroups.has(groupKey)) {
      edgeGroups.set(groupKey, []);
    }
    edgeGroups.get(groupKey)!.push(edge);
  }

  // Add edgeIndex and totalEdges to each edge's data for offset calculation
  for (const [, group] of edgeGroups) {
    // Sort alphabetically by fieldName for consistent ordering
    group.sort((a, b) => (a.data?.fieldName ?? '').localeCompare(b.data?.fieldName ?? ''));

    group.forEach((edge, index) => {
      if (edge.data) {
        edge.data.edgeIndex = index;
        edge.data.totalEdges = group.length;
      }
    });
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
