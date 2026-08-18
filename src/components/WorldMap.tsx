import { useState } from "react"
import type { Country } from "../domain/country"
import { isSelected } from "../domain/selection"
import { labelAnchor, type PlanarPoint, type Projector } from "../map/geometry"
import { MAP_HEIGHT, MAP_WIDTH, mapPath, projection } from "../map/projection"
import { countryFeatures, countryOf } from "../map/world"

type RenderedCountry = {
  readonly country: Country
  readonly d: string
  readonly anchor: PlanarPoint
}

const projectLngLat: Projector = (lngLat) => {
  const point = projection([lngLat[0], lngLat[1]])
  return point ? [point[0], point[1]] : [0, 0]
}

const renderedCountries: readonly RenderedCountry[] = countryFeatures.map((feature) => ({
  country: countryOf(feature),
  d: mapPath(feature) ?? "",
  anchor: labelAnchor(feature.geometry, projectLngLat),
}))

type WorldMapProps = {
  readonly selected: readonly Country[]
  readonly onToggleCountry: (country: Country) => void
  readonly belligerentIds?: ReadonlySet<string>
}

export default function WorldMap({ selected, onToggleCountry, belligerentIds }: WorldMapProps) {
  const [hovered, setHovered] = useState<Country | null>(null)
  const [cursor, setCursor] = useState<PlanarPoint>([0, 0])

  const selectedWithAnchors = renderedCountries.filter((rc) => isSelected(selected, rc.country))

  return (
    <div
      className="world-map"
      onMouseMove={(event) => setCursor([event.clientX, event.clientY])}
      onMouseLeave={() => setHovered(null)}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label="نقشه جهان — برای انتخاب کشورها روی آن‌ها کلیک کنید"
      >
        <path className="ocean" d={mapPath({ type: "Sphere" }) ?? ""} />
        {renderedCountries.map(({ country, d }) => {
          const classes = ["country"]
          if (isSelected(selected, country)) classes.push("selected")
          if (belligerentIds?.has(country.id)) classes.push("belligerent")
          if (hovered?.id === country.id) classes.push("hovered")
          return (
            <path
              key={country.id}
              className={classes.join(" ")}
              d={d}
              onMouseEnter={() => setHovered(country)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onToggleCountry(country)}
            />
          )
        })}
        {selectedWithAnchors.map(({ country, anchor }) => (
          <text
            key={`label-${country.id}`}
            className="country-label"
            x={anchor[0]}
            y={anchor[1]}
          >
            {country.name}
          </text>
        ))}
      </svg>
      {hovered && (
        <div
          className="country-tooltip"
          style={{
            left: Math.min(cursor[0] + 14, window.innerWidth - 180),
            top: cursor[1] + 16,
          }}
        >
          {hovered.name}
        </div>
      )}
    </div>
  )
}
