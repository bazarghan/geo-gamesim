import { describe, expect, it } from "vitest"
import type { MultiPolygon, Polygon } from "geojson"
import { labelAnchor } from "./geometry"

const identity = (lngLat: readonly number[]) => [lngLat[0], lngLat[1]] as const

// GeoJSON rings are closed: first point == last point.
const square: Polygon = {
  type: "Polygon",
  coordinates: [[[2, 2], [6, 2], [6, 6], [2, 6], [2, 2]]],
}

describe("labelAnchor", () => {
  it("anchors at the centroid of a polygon", () => {
    expect(labelAnchor(square, identity)).toEqual([4, 4])
  })

  it("anchors at the area centroid of a concave polygon", () => {
    // 4x4 square minus the 2x2 top-right quadrant: area 12, centroid (5/3, 5/3)
    const ell: Polygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4], [0, 0]]],
    }
    const [x, y] = labelAnchor(ell, identity)
    expect(x).toBeCloseTo(5 / 3)
    expect(y).toBeCloseTo(5 / 3)
  })

  it("anchors inside the largest polygon of a multipolygon", () => {
    // A small square at (0,0)–(1,1) loses to the 4x4 square at (2,2)–(6,6)
    const smallWinsOverTiny: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        square.coordinates,
      ],
    }
    // A big square at (10,10)–(20,20) beats the 4x4 square too
    const bigSquare: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
        square.coordinates,
      ],
    }
    expect(labelAnchor(smallWinsOverTiny, identity)).toEqual([4, 4])
    expect(labelAnchor(bigSquare, identity)).toEqual([15, 15])
  })

  it("projects coordinates through the supplied projector", () => {
    const flipped = (lngLat: readonly number[]) => [lngLat[1], lngLat[0]] as const
    expect(labelAnchor(square, flipped)).toEqual([4, 4])
  })
})
