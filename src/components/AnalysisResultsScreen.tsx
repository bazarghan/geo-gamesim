import { useMemo } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Country } from "../domain/country"
import {
  alignmentLabel,
  analyzeScenario,
  type AnalysisResult,
  type ConvergencePoint,
} from "../domain/analysis"
import type { PayoffParametersResult } from "../llm/payoffCache"

type AnalysisResultsScreenProps = {
  readonly countries: readonly Country[]
  readonly results: Readonly<Record<string, PayoffParametersResult>>
}

/** A palette for the per-party convergence lines, cycling for many parties. */
const LINE_COLORS = [
  "#f5a524",
  "#60a5fa",
  "#34d399",
  "#f87171",
  "#c084fc",
  "#f472b6",
  "#38bdf8",
  "#a3e635",
  "#fb923c",
  "#e879f9",
] as const

/** How each Alignment appears in the table and badges. */
const ALIGNMENT_LABELS: Readonly<Record<string, string>> = {
  "SIDE A": "Side A",
  "SIDE B": "Side B",
  NEUTRAL: "Neutral",
}

/**
 * The results half of a Conflict Scenario, shown once every party has Payoff
 * Parameters: an Alignment table, Nash Equilibrium cards (or the closest-to-
 * stable fallback), and a MARL convergence chart of each party's Alignment.
 */
export default function AnalysisResultsScreen({ countries, results }: AnalysisResultsScreenProps) {
  const analysis = useMemo(
    () => analyzeScenario(countries, results),
    [countries, results],
  )

  return (
    <section className="analysis-results" aria-label="Conflict analysis results">
      <div className="analysis-header">
        <h2>Analysis Results</h2>
        {analysis.hasEquilibrium ? (
          <p className="analysis-note">Nash equilibria found.</p>
        ) : (
          <p className="analysis-note">No stable profile — showing the closest to stable.</p>
        )}
      </div>

      <AlignmentTable analysis={analysis} />
      <NashCards analysis={analysis} countries={countries} />
      <ConvergenceChart analysis={analysis} />
    </section>
  )
}

function AlignmentTable({ analysis }: { readonly analysis: AnalysisResult }) {
  return (
    <div className="analysis-block">
      <h3>Alignment</h3>
      <table className="alignment-table">
        <thead>
          <tr>
            <th scope="col">Party</th>
            <th scope="col">Alignment</th>
            <th scope="col">Power Weight</th>
            <th scope="col">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {analysis.rows.map((row) => (
            <tr key={row.id}>
              <td className="alignment-party">{row.name}</td>
              <td>
                <span className={`alignment-badge alignment-${row.alignment.replaceAll(" ", "-")}`}>
                  {ALIGNMENT_LABELS[row.alignment]}
                </span>
              </td>
              <td className="alignment-power">{row.powerWeight}</td>
              <td className="alignment-rationale">{row.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NashCards({
  analysis,
  countries,
}: {
  readonly analysis: AnalysisResult
  readonly countries: readonly Country[]
}) {
  const { nash } = analysis

  if (!analysis.hasEquilibrium) {
    const fallback = nash.fallback
    if (!fallback) return null
    return (
      <div className="analysis-block">
        <h3>Nash Equilibrium</h3>
        <div className="nash-no-stable">
          <p className="nash-no-title">
            No stable profile — closest to stable ({nash.fallbackDefections} defection
            {nash.fallbackDefections === 1 ? "" : "s"})
          </p>
          <ProfileChips profile={fallback} countries={countries} />
        </div>
      </div>
    )
  }

  return (
    <div className="analysis-block">
      <h3>Nash Equilibria</h3>
      <div className="nash-cards">
        {nash.equilibria.map((profile, index) => {
          const pareto = nash.paretoOptimal[index]
          const converged = analysis.convergedEquilibriumIndex === index
          return (
            <div
              key={index}
              className={[
                "nash-card",
                pareto ? "nash-pareto" : "",
                converged ? "nash-converged" : "",
              ]
                .join(" ")
                .trim()}
            >
              {pareto && <span className="nash-tag">Pareto-best</span>}
              {converged && <span className="nash-tag nash-tag-converged">MARL converged</span>}
              <ProfileChips profile={profile} countries={countries} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProfileChips({
  profile,
  countries,
}: {
  readonly profile: readonly string[]
  readonly countries: readonly Country[]
}) {
  return (
    <ul className="nash-profile">
      {profile.map((alignment, index) => (
        <li key={index} className="nash-profile-item">
          <span className="nash-party">{countries[index]?.name ?? `Party ${index + 1}`}</span>
          <span className={`nash-alignment nash-alignment-${alignment.replaceAll(" ", "-")}`}>
            {ALIGNMENT_LABELS[alignment] ?? alignment}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ConvergenceChart({ analysis }: { readonly analysis: AnalysisResult }) {
  return (
    <div className="analysis-block">
      <h3>MARL Convergence</h3>
      <div className="convergence-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analysis.points} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#22314f" strokeDasharray="3 3" />
            <XAxis
              dataKey="episode"
              type="number"
              domain={[0, "dataMax"]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#8ba0c0" }}
            />
            <YAxis
              domain={[0, 2]}
              ticks={[0, 1, 2]}
              tickFormatter={(value: number) => alignmentLabel(value)}
              tick={{ fontSize: 11, fill: "#8ba0c0" }}
            />
            <Tooltip content={convergenceTooltip} />
            <Legend />
            {analysis.rows.map((row, index) => (
              <Line
                key={row.id}
                type="stepAfter"
                dataKey={row.id}
                name={row.name}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function convergenceTooltip(props: {
  readonly active?: boolean
  readonly payload?: readonly { readonly payload?: unknown }[]
}) {
  if (!props.active) return null
  const datum = props.payload?.[0]?.payload as ConvergencePoint | undefined
  if (!datum) return null
  return (
    <div className="convergence-tooltip">
      <p className="convergence-tooltip-title">Episode {datum.episode}</p>
      {Object.entries(datum)
        .filter(([key]) => key !== "episode")
        .map(([partyId, code]) => (
          <p key={partyId}>{alignmentLabel(code as number)}</p>
        ))}
    </div>
  )
}
