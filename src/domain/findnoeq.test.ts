import { it } from "vitest"
import { findNashEquilibria, type Party } from "./gameEngine"

const as = [0, 3, 6, 9]
const bs = as
const ns = as
const ws = as

function party(id: string, p: [number, number, number, number]): Party {
  return { id, parameters: { affinitySideA: p[0], affinitySideB: p[1], neutralityValue: p[2], powerWeight: p[3] } }
}

it("find a no-equilibrium 2-party game", () => {
  let count = 0
  const combos: [number,number,number,number][] = []
  for (const a of as) for (const b of bs) for (const n of ns) for (const w of ws) combos.push([a,b,n,w])
  for (const e1 of combos) {
    for (const e2 of combos) {
      const eq = findNashEquilibria([party("p1", e1), party("p2", e2)])
      if (eq.equilibria.length === 0) {
        console.log("2-party NOEQ:", JSON.stringify(e1), JSON.stringify(e2))
        console.log("fallback:", JSON.stringify(eq.fallback), "defections:", eq.fallbackDefections)
        count++
        if (count > 10) return
      }
    }
  }
  console.log("searched done, noeq count:", count)
}, 60000)
