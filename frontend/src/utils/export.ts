/**
 * Export utilities for the ERD diagram.
 * Supports PNG, SVG, and JSON export formats.
 * Uses html-to-image@1.11.11 (exact version required per React Flow docs).
 */

import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

/**
 * Export options for image generation.
 */
export interface ExportOptions {
  /** Resolution multiplier (1x = standard, 2x = retina, 3x = high-res) */
  resolution: 1 | 2 | 3;
  /** Background color for the export */
  background: 'white' | 'transparent';
  /** Whether to include the legend panel in the export */
  includeLegend: boolean;
}

/**
 * JSON export format for diagram data.
 */
export interface DiagramExport {
  version: '1.0';
  exportedAt: string;
  metadata: {
    objectCount: number;
    relationshipCount: number;
  };
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: {
      label: string;
      apiName: string;
      isCustom: boolean;
      fieldCount: number;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    data: {
      fieldName: string;
      relationshipType: string;
    };
  }>;
}

// Padding around the diagram in pixels
// Needs to account for:
// - Edge labels extending beyond node bounds (~150px for long field names)
// - OWD badges that overflow above nodes (~30px)
// - Cardinality labels (1, N) on edges (~20px)
// - Edges that curve around nodes
const DIAGRAM_PADDING = 180;

/**
 * Creates a filter function for html-to-image that excludes UI elements.
 * @param includeLegend - Whether to include the legend panel
 */
function createElementFilter(includeLegend: boolean) {
  return (node: HTMLElement): boolean => {
    // Exclude React Flow controls (zoom buttons)
    if (node.classList?.contains('react-flow__controls')) {
      return false;
    }
    // Exclude minimap if present
    if (node.classList?.contains('react-flow__minimap')) {
      return false;
    }
    // Exclude panels (stats, control buttons) - but not the viewport content
    if (node.classList?.contains('react-flow__panel')) {
      // Check if this is the legend panel
      const isLegend = node.hasAttribute('data-export-legend');
      if (isLegend) {
        return includeLegend;
      }
      // Exclude all other panels (controls, stats)
      return false;
    }
    return true;
  };
}

/**
 * Calculates export dimensions for the diagram.
 * Uses a simple approach: size image to fit content at the given resolution.
 * @param nodes - Array of React Flow nodes
 * @param resolution - Resolution multiplier
 */
function calculateExportDimensions(nodes: Node[], resolution: number) {
  const nodesBounds = getNodesBounds(nodes);

  // Add padding around the diagram
  const bounds = {
    x: nodesBounds.x - DIAGRAM_PADDING,
    y: nodesBounds.y - DIAGRAM_PADDING,
    width: nodesBounds.width + DIAGRAM_PADDING * 2,
    height: nodesBounds.height + DIAGRAM_PADDING * 2,
  };

  // Calculate final image dimensions
  const imageWidth = bounds.width * resolution;
  const imageHeight = bounds.height * resolution;

  // Simple transform: translate to origin, then scale
  // CSS transforms apply right-to-left, so scale(R) translate(X,Y) means:
  // 1. First translate (move bounds.x,y to 0,0)
  // 2. Then scale by resolution
  const transform = `scale(${resolution}) translate(${-bounds.x}px, ${-bounds.y}px)`;

  return { bounds, imageWidth, imageHeight, transform };
}

/**
 * Export the diagram as a PNG image.
 * @param nodes - Array of React Flow nodes
 * @param options - Export options
 * @returns Promise resolving to a PNG Blob
 */
export async function exportToPng(
  nodes: Node[],
  options: ExportOptions
): Promise<Blob> {
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) {
    throw new Error('React Flow viewport not found');
  }

  if (nodes.length === 0) {
    throw new Error('No nodes to export');
  }

  const { imageWidth, imageHeight, transform } = calculateExportDimensions(nodes, options.resolution);

  const dataUrl = await toPng(viewportElement, {
    backgroundColor: options.background === 'transparent' ? undefined : '#ffffff',
    width: imageWidth,
    height: imageHeight,
    filter: createElementFilter(options.includeLegend),
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform,
    },
  });

  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Export the diagram as an SVG string.
 * @param nodes - Array of React Flow nodes
 * @param options - Export options
 * @returns Promise resolving to SVG string content
 */
export async function exportToSvg(
  nodes: Node[],
  options: ExportOptions
): Promise<string> {
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) {
    throw new Error('React Flow viewport not found');
  }

  if (nodes.length === 0) {
    throw new Error('No nodes to export');
  }

  const { imageWidth, imageHeight, transform } = calculateExportDimensions(nodes, options.resolution);

  const dataUrl = await toSvg(viewportElement, {
    backgroundColor: options.background === 'transparent' ? undefined : '#ffffff',
    width: imageWidth,
    height: imageHeight,
    filter: createElementFilter(options.includeLegend),
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform,
    },
  });

  // Decode SVG from data URL
  // Format: data:image/svg+xml;charset=utf-8,...
  const svgContent = decodeURIComponent(dataUrl.split(',')[1]);
  return svgContent;
}

/**
 * Export the diagram data as JSON.
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns JSON string of the diagram data
 */
export function exportToJson(nodes: Node[], edges: Edge[]): string {
  const exportData: DiagramExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      objectCount: nodes.length,
      relationshipCount: edges.length,
    },
    nodes: nodes.map(node => ({
      id: node.id,
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>).label as string || '',
        apiName: (node.data as Record<string, unknown>).apiName as string || node.id,
        isCustom: (node.data as Record<string, unknown>).isCustom as boolean || false,
        fieldCount: ((node.data as Record<string, unknown>).fields as unknown[] || []).length,
      },
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        fieldName: (edge.data as Record<string, unknown>)?.fieldName as string || '',
        relationshipType: (edge.data as Record<string, unknown>)?.relationshipType as string || 'lookup',
      },
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Copy the diagram as a PNG image to the clipboard.
 * @param nodes - Array of React Flow nodes
 * @param options - Export options
 */
export async function copyImageToClipboard(
  nodes: Node[],
  options: ExportOptions
): Promise<void> {
  const blob = await exportToPng(nodes, options);

  // Check for Clipboard API support
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard API not available. Please use HTTPS or localhost.');
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
}

/**
 * Download a Blob as a file.
 * @param blob - The Blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download text content as a file.
 * @param content - The text content to download
 * @param filename - The filename for the download
 * @param mimeType - The MIME type (default: text/plain)
 */
export function downloadText(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Generate a filename with date for exports.
 * @param extension - File extension (png, svg, json)
 * @returns Formatted filename like "schema_diagram_2025-01-15.png"
 */
export function generateFilename(extension: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `schema_diagram_${date}.${extension}`;
}
