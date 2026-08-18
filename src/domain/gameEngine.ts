/** A Party's stance in a Conflict Scenario (see CONTEXT.md, "Alignment"). */
export type Alignment = "SIDE A" | "SIDE B" | "NEUTRAL"

/** The three possible Alignments, in the order profiles are enumerated. */
export const ALIGNMENTS: readonly Alignment[] = ["SIDE A", "SIDE B", "NEUTRAL"]

/**
 * The per-Party numbers the LLM produces and game theory consumes
 * (see CONTEXT.md, "Payoff Parameters").
 */
export type PayoffParameters = {
  /** Affinity to Side A, 0–10. */
  readonly affinitySideA: number
  /** Affinity to Side B, 0–10. */
  readonly affinitySideB: number
  /** Intrinsic value of staying out, 0–10. */
  readonly neutralityValue: number
  /** How much influence this Party contributes to a bloc, 0–10. */
  readonly powerWeight: number
}

/** Clamp every Payoff Parameter field to its 0–10 semantics. */
export function clampPayoffParameters(p: PayoffParameters): PayoffParameters {
  return {
    affinitySideA: clamp10(p.affinitySideA),
    affinitySideB: clamp10(p.affinitySideB),
    neutralityValue: clamp10(p.neutralityValue),
    powerWeight: clamp10(p.powerWeight),
  }
}

/** A Party (identified by id) plus the parameters produced for it. */
export type Party = {
  readonly id: string
  readonly parameters: PayoffParameters
}

/** One Alignment per Party, same order and length as the Party list. */
export type AlignmentProfile = readonly Alignment[]

/** The cost of actively being at war on a side. */
export const WAR_COST = 5

/** The magnitude of the benefit a bloc's overall power share confers. */
export const BLOC_SCALE = 10

/** Neutrality's safety value per point of the Party's own power weight. */
export const NEUTRAL_SAFETY_PER_POWER = 1

/**
 * The payoff a Party extracts from a bloc it joins: the bloc's share of
 * total system power, scaled by {@link BLOC_SCALE}. Growing a side (or
 * joining the bigger side) raises every member's benefit, which is what
 * makes coordination on a common side an attractive, stable outcome.
 */
function blocBenefit(parties: readonly Party[], profile: AlignmentProfile, side: Alignment): number {
  let blocPower = 0
  let totalPower = 0
  for (let i = 0; i < parties.length; i++) {
    const w = parties[i].parameters.powerWeight
    totalPower += w
    if (profile[i] === side) blocPower += w
  }
  if (totalPower <= 0) return 0
  return BLOC_SCALE * (blocPower / totalPower)
}

/**
 * The payoff a Party earns under a full Alignment Profile (see CONTEXT.md,
 * "Payoff Parameters"): joining a side scores affinity to that side plus
 * power-share of the bloc minus the war cost; neutrality scores the
 * neutrality value plus power safety.
 */
export function payoffs(parties: readonly Party[], profile: AlignmentProfile): readonly number[] {
  const out: number[] = new Array(parties.length)
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i].parameters
    const a = profile[i]
    if (a === "NEUTRAL") {
      out[i] = round2(p.neutralityValue + NEUTRAL_SAFETY_PER_POWER * p.powerWeight)
      continue
    }
    const affinity = a === "SIDE A" ? p.affinitySideA : p.affinitySideB
    out[i] = round2(affinity + blocBenefit(parties, profile, a) - WAR_COST)
  }
  return out
}

/** Whether a single Party can strictly raise its payoff by switching Alignment. */
function hasProfitableDeviation(parties: readonly Party[], profile: AlignmentProfile, i: number): boolean {
  const current = payoffs(parties, profile)[i]
  for (const alt of ALIGNMENTS) {
    if (alt === profile[i]) continue
    const variant = profile.slice() as Alignment[]
    variant[i] = alt
    if (payoffs(parties, variant)[i] > current) return true
  }
  return false
}

/** A profile plus how far it is from being a Nash Equilibrium. */
export type Stability = {
  readonly profile: AlignmentProfile
  /** Number of Parties that could strictly improve by unilaterally switching Alignment. */
  readonly defections: number
}

/**
 * The profile closest to stable — the one with the fewest Parties able to
 * improve by defecting alone. Used as the no-equilibrium fallback. Ties are
 * resolved by enumeration order, keeping the result deterministic. When the
 * returned profile has zero defections it is itself a Nash Equilibrium.
 */
export function closestToStable(parties: readonly Party[]): Stability {
  let bestProfile: AlignmentProfile | null = null
  let bestDefections = Infinity
  for (const profile of enumerateProfiles(parties)) {
    const defections = defectionCount(parties, profile)
    if (defections < bestDefections) {
      bestDefections = defections
      bestProfile = profile
    }
  }
  return { profile: bestProfile as AlignmentProfile, defections: bestDefections }
}

/** Every Alignment Profile — all 3^n combinations, exactly. */
export function enumerateProfiles(parties: readonly Party[]): readonly AlignmentProfile[] {
  const n = parties.length
  const profileCount = Math.pow(3, n)
  const profiles: AlignmentProfile[] = []
  for (let code = 0; code < profileCount; code++) {
    const profile: Alignment[] = []
    let c = code
    for (let i = 0; i < n; i++) {
      profile.push(ALIGNMENTS[c % 3])
      c = Math.floor(c / 3)
    }
    profiles.push(profile)
  }
  return profiles
}

/** Number of Parties in `profile` that can strictly improve by defecting alone. */
function defectionCount(parties: readonly Party[], profile: AlignmentProfile): number {
  let count = 0
  for (let i = 0; i < parties.length; i++) {
    if (hasProfitableDeviation(parties, profile, i)) count++
  }
  return count
}

/**
 * A profile `a` strictly Pareto-dominates `b` when every Party does at least
 * as well and at least one does strictly better.
 */
function dominates(parties: readonly Party[], a: AlignmentProfile, b: AlignmentProfile): boolean {
  const pa = payoffs(parties, a)
  const pb = payoffs(parties, b)
  let strictlyBetter = false
  for (let i = 0; i < parties.length; i++) {
    if (pa[i] < pb[i]) return false
    if (pa[i] > pb[i]) strictlyBetter = true
  }
  return strictlyBetter
}

function profilesEqual(a: AlignmentProfile, b: AlignmentProfile): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/** Export of a Nash analysis of a Conflict Scenario. */
export type NashResult = {
  /** Every pure Nash Equilibrium, in enumeration order. */
  readonly equilibria: readonly AlignmentProfile[]
  /** Whether the equilibrium at the matching index is Pareto-optimal (not strictly dominated by another equilibrium). */
  readonly paretoOptimal: readonly boolean[]
  /** Index of the first Pareto-optimal equilibrium, or null when none exists. */
  readonly paretoBest: number | null
  /** When no equilibrium exists, the closest-to-stable profile (fewest unilateral defections); otherwise null. */
  readonly fallback: AlignmentProfile | null
  /** Number of unilateral defections in the fallback profile (0 when equilibria exist). */
  readonly fallbackDefections: number
}

/**
 * Enumerate every Alignment Profile — all 3^n combinations, exactly — and
 * find every pure Nash Equilibrium, flagging the Pareto-best. With no
 * equilibrium, report the profile closest to stable (fewest Parties able to
 * improve by unilaterally switching). Deterministic: identical inputs yield
 * identical results.
 */
export function findNashEquilibria(parties: readonly Party[]): NashResult {
  const equilibria: AlignmentProfile[] = []
  for (const profile of enumerateProfiles(parties)) {
    if (defectionCount(parties, profile) === 0) equilibria.push(profile)
  }

  const paretoOptimal = equilibria.map((eq, idx) =>
    !equilibria.some((other, oi) => oi !== idx && dominates(parties, other, eq)),
  )
  const paretoBestIndex = paretoOptimal.findIndex(Boolean)
  const empty = equilibria.length === 0
  const nearStable = empty ? closestToStable(parties) : null

  return {
    equilibria,
    paretoOptimal,
    paretoBest: paretoBestIndex >= 0 ? paretoBestIndex : null,
    fallback: nearStable?.profile ?? null,
    fallbackDefections: nearStable?.defections ?? 0,
  }
}

/** One episode of the MARL run — the joint Alignment plus each Party's payoff. */
export type MarlEpisode = {
  readonly index: number
  readonly profile: AlignmentProfile
  readonly payoffs: readonly number[]
}

/** Result of the MARL equilibrium-selection run. */
export type MarlResult = {
  /** One joint Alignment per episode, in training order. */
  readonly episodes: readonly MarlEpisode[]
  /** The deterministic profile each agent's learned policy greedily picks after training. */
  readonly convergedProfile: AlignmentProfile
  /** The Nash Equilibrium the converged profile corresponds to, or null if it is not itself an equilibrium. */
  readonly convergedEquilibrium: AlignmentProfile | null
}

/**
 * Independent Q-learning (epsilon-greedy, ~1000 episodes) over the joint
 * Alignment space. Each Party is a single agent choosing its own Alignment
 * and updating a Q-table toward the payoff its choice yielded. Deterministic:
 * the same Parties and seed produce the identical run.
 */
export function runMarl(
  parties: readonly Party[],
  options: { readonly episodes?: number; readonly seed?: string } = {},
): MarlResult {
  const episodes = options.episodes ?? EPISODES
  const seedText = options.seed ?? parties.map((p) => p.id).join("::")
  const random = mulberry32(hashSeed(`marl::${seedText}`))
  const n = parties.length
  const q: number[][] = Array.from({ length: n }, () => [0, 0, 0])
  const history: MarlEpisode[] = []

  let epsilon = EXPLORATION_START
  const decay = Math.pow(GREEDY_MIN / EXPLORATION_START, 1 / Math.max(1, episodes))

  for (let index = 0; index < episodes; index++) {
    const profile: Alignment[] = []
    for (let i = 0; i < n; i++) {
      const action = random() < epsilon ? Math.floor(random() * 3) : argmax(q[i])
      profile.push(ALIGNMENTS[action])
    }
    const epPayoffs = payoffs(parties, profile)
    for (let i = 0; i < n; i++) {
      const a = ALIGNMENTS.indexOf(profile[i])
      q[i][a] = (1 - LEARNING_RATE) * q[i][a] + LEARNING_RATE * epPayoffs[i]
    }
    history.push({ index, profile, payoffs: epPayoffs })
    epsilon *= decay
  }

  const converged: Alignment[] = []
  for (let i = 0; i < n; i++) converged.push(ALIGNMENTS[argmax(q[i])])
  const { equilibria } = findNashEquilibria(parties)
  const convergedEquilibrium = equilibria.find((eq) => profilesEqual(eq, converged)) ?? null

  return { episodes: history, convergedProfile: converged, convergedEquilibrium }
}

/** Default number of MARL episodes to train for. */
export const EPISODES = 1000
/** Independent Q-learning update step size. */
export const LEARNING_RATE = 0.1
/** Final exploration rate after the epsilon-greedy decay. */
export const GREEDY_MIN = 0.05
/** Initial exploration rate of the epsilon-greedy schedule. */
export const EXPLORATION_START = 1.0

function argmax(vals: readonly number[]): number {
  let best = 0
  for (let i = 1; i < vals.length; i++) if (vals[i] > vals[best]) best = i
  return best
}

function clamp10(value: number): number {
  return round2(Math.min(10, Math.max(0, value)))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** FNV-1a — turns arbitrary text into a stable PRNG seed. */
function hashSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** mulberry32 — small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
