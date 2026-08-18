import type { MultiPolygon, Polygon } from "geojson"

/** A point in projected (planar) map coordinates. */
export type PlanarPoint = readonly [number, number]

/** Projects a [longitude, latitude] pair to planar coordinates. */
export type Projector = (lngLat: readonly number[]) => PlanarPoint

function signedArea(points: readonly PlanarPoint[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

function centroid(points: readonly PlanarPoint[]): PlanarPoint {
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    const cross = x1 * y2 - x2 * y1
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  const area = signedArea(points)
  if (area === 0) {
    const mean = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0])
    return [mean[0] / points.length, mean[1] / points.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

/**
 * A readable anchor point for a country's label: the area centroid of its
 * largest (outer) ring in projected coordinates. Using the largest polygon
 * keeps labels on the mainland for countries with distant territories
 * (e.g. France, United States).
 */
export function labelAnchor(
  geometry: Polygon | MultiPolygon,
  project: Projector,
): PlanarPoint {
  const polygons: readonly number[][][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates

  let best: { area: number; points: readonly PlanarPoint[] } | null = null
  for (const polygon of polygons) {
    const points = polygon[0].map(project)
    const area = Math.abs(signedArea(points))
    if (best === null || area > best.area) best = { area, points }
  }
  return best ? centroid(best.points) : [0, 0]
}
