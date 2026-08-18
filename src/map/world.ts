import { feature } from "topojson-client"
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson"
import type { GeometryCollection } from "topojson-specification"
import topology from "world-atlas/countries-110m.json"
import type { Country } from "../domain/country"

export type CountryProperties = { name: string }
export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties> & { id: string }

/** Countries left off the map: Natural Earth 110m, Antarctica excluded. */
const EXCLUDED_COUNTRIES = new Set(["Antarctica"])

function isPolygonal(geometry: Geometry): geometry is Polygon | MultiPolygon {
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon"
}

const collection = feature(
  topology,
  topology.objects.countries as GeometryCollection,
) as unknown as FeatureCollection<Geometry, CountryProperties | undefined>

/** Every Natural Earth 110m country except Antarctica, as drawable polygons. */
export const countryFeatures: readonly CountryFeature[] = collection.features.flatMap(
  (f): CountryFeature[] => {
    const name = f.properties?.name
    if (typeof name !== "string" || EXCLUDED_COUNTRIES.has(name)) return []
    if (!isPolygonal(f.geometry)) return []
    return [
      {
        id: f.id !== undefined ? String(f.id) : `ne:${name}`,
        type: "Feature",
        geometry: f.geometry,
        properties: { name },
      },
    ]
  },
)

export function countryOf(countryFeature: CountryFeature): Country {
  return { id: countryFeature.id, name: countryFeature.properties.name }
}
