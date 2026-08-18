/** The existing bilateral simulation mode. */
export const BILATERAL_MODE = "bilateral"

/** The conflict scenario mode (see CONTEXT.md, "Conflict Scenario"). */
export const CONFLICT_MODE = "conflict"

/** The two app modes behind the header toggle. */
export type SimulationMode = typeof BILATERAL_MODE | typeof CONFLICT_MODE