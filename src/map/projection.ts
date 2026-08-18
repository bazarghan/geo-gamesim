import { geoNaturalEarth1, geoPath } from "d3-geo"

export const MAP_WIDTH = 960
export const MAP_HEIGHT = 500
const MAP_PADDING = 6

/** Natural Earth projection fitted to the map viewport. */
export const projection = geoNaturalEarth1().fitExtent(
  [
    [MAP_PADDING, MAP_PADDING],
    [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
  ],
  { type: "Sphere" },
)

export const mapPath = geoPath(projection)
