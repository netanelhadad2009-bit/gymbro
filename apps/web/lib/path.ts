/**
 * SVG Path Generation for Journey Map
 * Creates a curved Bézier path and calculates node positions
 */

export interface Point {
  x: number;
  y: number;
}

export interface PathNode extends Point {
  angle: number;
  index: number;
}

/**
 * Generate a smooth S-curve path using cubic Bézier
 * Returns SVG path string
 */
export function generateJourneyPath(
  width: number,
  height: number,
  nodeCount: number
): string {
  const padding = 100;
  const centerX = width / 2;

  // Create control points for a flowing S-curve
  const points: Point[] = [];
  const segmentHeight = (height - padding * 2) / (nodeCount - 1);

  for (let i = 0; i < nodeCount; i++) {
    const y = padding + i * segmentHeight;
    // Alternate left and right for natural flow
    const xOffset = Math.sin(i * 0.8) * (width * 0.15);
    const x = centerX + xOffset;
    points.push({ x, y });
  }

  // Build cubic Bézier path
  let pathD = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    const cp1x = current.x + (next.x - current.x) * 0.3;
    const cp1y = current.y + (next.y - current.y) * 0.5;
    const cp2x = current.x + (next.x - current.x) * 0.7;
    const cp2y = current.y + (next.y - current.y) * 0.5;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return pathD;
}

/**
 * Calculate positions for nodes along the path
 * Evenly distributed by path length
 */
export function calculateNodePositions(
  pathD: string,
  nodeCount: number
): PathNode[] {
  // For a more accurate implementation, you'd use svg-path-properties
  // For now, we'll approximate based on control points

  const nodes: PathNode[] = [];
  const matches = pathD.match(/(-?\d+\.?\d*)\s(-?\d+\.?\d*)/g) || [];

  // Extract points from path
  const pathPoints: Point[] = [];
  for (let i = 0; i < matches.length; i += 2) {
    const coords = matches[i].split(/\s/);
    if (coords.length >= 2) {
      pathPoints.push({
        x: parseFloat(coords[0]),
        y: parseFloat(coords[1]),
      });
    }
  }

  // Distribute nodes evenly
  const step = pathPoints.length / nodeCount;
  for (let i = 0; i < nodeCount; i++) {
    const idx = Math.min(Math.floor(i * step), pathPoints.length - 1);
    const point = pathPoints[idx];

    // Calculate angle for badge orientation
    const nextIdx = Math.min(idx + 1, pathPoints.length - 1);
    const next = pathPoints[nextIdx];
    const angle = Math.atan2(next.y - point.y, next.x - point.x);

    nodes.push({
      x: point.x,
      y: point.y,
      angle,
      index: i,
    });
  }

  return nodes;
}

/**
 * Get approximate path length (simplified)
 */
export function getPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Viewport bounds for pan/zoom constraints
 */
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function calculateBounds(
  width: number,
  height: number,
  padding: number = 200
): Bounds {
  return {
    minX: -padding,
    maxX: padding,
    minY: -padding,
    maxY: height - padding,
  };
}
