import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ROUND_COUNT, type Simulation } from "../sim/engine"
import { OUTCOME_COLORS, detailFor, trajectoryData, type TrajectoryDatum } from "../sim/trajectory"

/** Playback speeds, slowest to fastest — milliseconds of story per Round. */
const SPEEDS = [
  { label: "0.5×", ms: 800 },
  { label: "1×", ms: 400 },
  { label: "2×", ms: 200 },
  { label: "4×", ms: 100 },
] as const

type PairingPlaybackProps = {
  readonly simulation: Simulation
  readonly rationale?: string
}

/**
 * The watchable half of a Pairing's war/peace story: playback controls drive
 * a recharts trajectory of the precomputed Rounds and the drifting
 * Friendliness Score, ending in the Pairing's Verdict.
 */
export default function PairingPlayback({ simulation, rationale }: PairingPlaybackProps) {
  const [currentRound, setCurrentRound] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)

  const atEnd = currentRound >= ROUND_COUNT
  const playingNow = playing && !atEnd

  useEffect(() => {
    if (!playing || atEnd) return
    const id = window.setInterval(
      () => setCurrentRound((round) => Math.min(round + 1, ROUND_COUNT)),
      SPEEDS[speedIndex].ms,
    )
    return () => window.clearInterval(id)
  }, [playing, atEnd, speedIndex, currentRound])

  const data = useMemo(() => trajectoryData(simulation, currentRound), [simulation, currentRound])
  const round = simulation.rounds[currentRound - 1]
  const { left, right } = simulation.pairing

  const togglePlay = () => {
    if (atEnd) {
      setCurrentRound(1)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  const reset = () => {
    setPlaying(false)
    setCurrentRound(1)
  }

  return (
    <article className="playback-card" aria-label={`Simulation playback for ${left.name} and ${right.name}`}>
      <header className="playback-header">
        <div>
          <h3 className="playback-name">
            {left.name} — {right.name}
          </h3>
          <p className="playback-score">
            Initial score {simulation.initialScore} · final {simulation.finalScore}
          </p>
        </div>
        <span className={`verdict-badge verdict-${simulation.verdict.toLowerCase().replaceAll(" ", "-")}`}>
          {simulation.verdict}
        </span>
      </header>

      {rationale && <p className="playback-rationale">{rationale}</p>}

      <div className="playback-chart">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#22314f" strokeDasharray="3 3" />
            <XAxis
              dataKey="round"
              type="number"
              domain={[1, ROUND_COUNT]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#8ba0c0" }}
              tickCount={11}
            />
            <YAxis
              yAxisId="score"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 11, fill: "#8ba0c0" }}
            />
            <YAxis yAxisId="moves" domain={[0, 4]} hide />
            <Tooltip content={roundTooltip} cursor={{ fill: "rgba(245, 165, 36, 0.08)" }} />
            <Bar yAxisId="moves" dataKey="move" barSize={4} isAnimationActive={false}>
              {data.map((datum) => (
                <Cell key={datum.round} fill={OUTCOME_COLORS[datum.outcome]} />
              ))}
            </Bar>
            <Line
              yAxisId="score"
              dataKey="score"
              stroke="#f5a524"
              strokeWidth={2}
              dot={{ r: 1.5, fill: "#f5a524" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="playback-round" role="status">
        Round {currentRound}/{ROUND_COUNT} — {detailFor(simulation, round)} · score {round.scoreAfter} ·{" "}
        {round.archetype} · {left.name} {round.leftTotal} pts, {right.name} {round.rightTotal} pts
      </p>

      <div className="playback-controls">
        <button
          type="button"
          className="play-button"
          onClick={togglePlay}
          aria-label={playingNow ? "Pause playback" : atEnd ? "Replay playback" : "Play playback"}
        >
          {playingNow ? "Pause" : atEnd ? "Replay" : "Play"}
        </button>
        <button type="button" className="ghost-button" onClick={reset} aria-label="Reset playback">
          Reset
        </button>
        <label className="speed-label">
          Speed
          <select
            className="speed-select"
            aria-label="Playback speed"
            value={speedIndex}
            onChange={(event) => setSpeedIndex(Number(event.target.value))}
          >
            {SPEEDS.map((speed, index) => (
              <option key={speed.label} value={index}>
                {speed.label}
              </option>
            ))}
          </select>
        </label>
        <input
          type="range"
          className="scrubber"
          min={1}
          max={ROUND_COUNT}
          step={1}
          value={currentRound}
          aria-label="Round scrubber"
          onChange={(event) => setCurrentRound(Number(event.target.value))}
        />
      </div>

      <p className="playback-legend">
        <span className="legend-dot" style={{ background: OUTCOME_COLORS["mutual cooperation"] }} /> mutual cooperation
        <span className="legend-dot" style={{ background: OUTCOME_COLORS.mixed }} /> mixed
        <span className="legend-dot" style={{ background: OUTCOME_COLORS["mutual defection"] }} /> mutual defection
      </p>
    </article>
  )
}

type RoundTooltipProps = {
  readonly active?: boolean
  readonly payload?: readonly { readonly payload?: unknown }[]
}

function roundTooltip(props: RoundTooltipProps) {
  if (!props.active) return null
  const datum = props.payload?.[0]?.payload as TrajectoryDatum | undefined
  if (!datum) return null
  return (
    <div className="round-tooltip">
      <p className="round-tooltip-title">Round {datum.round}</p>
      <p>{datum.detail}</p>
      <p>Score {datum.score}</p>
    </div>
  )
}
