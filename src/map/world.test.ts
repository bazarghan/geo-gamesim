import { describe, expect, it } from "vitest"
import { countryFeatures } from "./world"

describe("countryFeatures", () => {
  it("excludes Antarctica", () => {
    expect(countryFeatures.some((f) => f.properties.name === "Antarctica")).toBe(false)
  })

  it("covers the Natural Earth 110m country set (176 countries)", () => {
    expect(countryFeatures).toHaveLength(176)
  })

  it("has unique ids and names for every country", () => {
    expect(new Set(countryFeatures.map((f) => f.id)).size).toBe(countryFeatures.length)
    expect(new Set(countryFeatures.map((f) => f.properties.name)).size).toBe(countryFeatures.length)
  })

  it("contains only polygonal geometries", () => {
    for (const f of countryFeatures) {
      expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type)
    }
  })
})
