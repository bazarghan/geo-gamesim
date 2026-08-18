import type { OverallVerdict } from "../sim/aggregate"
import { verdictLabel } from "../i18n"

type OverallVerdictTileProps = {
  readonly verdict: OverallVerdict
}

/** The headline summary of a three-country run: PEACE, WAR, or TENSION. */
export default function OverallVerdictTile({ verdict }: OverallVerdictTileProps) {
  return (
    <div className={`overall-tile overall-${verdict.toLowerCase()}`} role="status">
      <p className="overall-label">داوری کلی</p>
      <p className="overall-value">{verdictLabel(verdict)}</p>
    </div>
  )
}
