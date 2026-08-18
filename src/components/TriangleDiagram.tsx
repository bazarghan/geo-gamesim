import type { Country } from "../domain/country"
import { pairingId, pairingOf } from "../domain/pairing"
import type { Simulation } from "../sim/engine"
import { VERDICT_COLORS } from "../sim/aggregate"
import { verdictLabel } from "../i18n"

type TriangleDiagramProps = {
  readonly countries: readonly Country[]
  readonly simulations: readonly Simulation[]
}

/** Fixed triangle geometry — countries sit at the vertices, Pairings on the edges. */
const VERTICES = [
  { x: 160, y: 48 },
  { x: 52, y: 224 },
  { x: 268, y: 224 },
] as const

/** Which vertices each of the three Pairings connects. */
const EDGES = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 2 },
] as const

/** Where each edge's Verdict label sits relative to its midpoint. */
const EDGE_LABEL_OFFSETS = [
  { dx: -14, dy: -4 },
  { dx: 14, dy: -4 },
  { dx: 0, dy: 18 },
] as const

/** Where each country label sits relative to its vertex. */
const VERTEX_LABEL_OFFSETS = [
  { dx: 0, dy: -24 },
  { dx: 0, dy: 26 },
  { dx: 0, dy: 26 },
] as const

/**
 * The three selected countries as triangle vertices, with each Pairing drawn
 * as an edge color-coded by its Verdict.
 */
export default function TriangleDiagram({ countries, simulations }: TriangleDiagramProps) {
  const byPairingId = new Map(
    simulations.map((simulation) => [pairingId(simulation.pairing), simulation]),
  )

  return (
    <svg
      className="triangle-diagram"
      viewBox="0 0 320 272"
      role="img"
      aria-label="مثلث سه کشور انتخاب‌شده با یال‌هایی که رنگشان وابسته به داوری هر جفت است"
    >
      {EDGES.map((edge, index) => {
        const from = VERTICES[edge.from]
        const to = VERTICES[edge.to]
        const simulation = byPairingId.get(
          pairingId(pairingOf(countries[edge.from], countries[edge.to])),
        )
        if (!simulation) return null
        const color = VERDICT_COLORS[simulation.verdict]
        const offset = EDGE_LABEL_OFFSETS[index]
        const mid = { x: (from.x + to.x) / 2 + offset.dx, y: (from.y + to.y) / 2 + offset.dy }
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <title>{`${simulation.pairing.left.name} — ${simulation.pairing.right.name}: ${verdictLabel(simulation.verdict)}`}</title>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              className="triangle-edge-label"
              fill={color}
            >
              {verdictLabel(simulation.verdict)}
            </text>
          </g>
        )
      })}
      {countries.slice(0, 3).map((country, index) => {
        const vertex = VERTICES[index]
        const offset = VERTEX_LABEL_OFFSETS[index]
        return (
          <g key={country.id}>
            <circle cx={vertex.x} cy={vertex.y} r={5} className="triangle-vertex" />
            <text
              x={vertex.x + offset.dx}
              y={vertex.y + offset.dy}
              textAnchor="middle"
              className="triangle-vertex-label"
            >
              {country.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
