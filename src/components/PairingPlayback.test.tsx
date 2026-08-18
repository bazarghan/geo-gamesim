import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import PairingPlayback from "./PairingPlayback"
import { simulate } from "../sim/engine"

const country = (id: string, name: string) => ({ id, name })
const france = country("250", "France")
const iran = country("364", "Iran")
const pairing = france.name < iran.name ? { left: france, right: iran } : { left: iran, right: france }

/** Render a card and strip SSR comment separators for clean matching. */
function playback(score: number) {
  return renderToString(<PairingPlayback simulation={simulate(pairing, score)} />).replaceAll("<!-- -->", "")
}

describe("PairingPlayback", () => {
  it("shows the Pairing, its initial and final score, and the Verdict", () => {
    const html = playback(0)

    expect(html).toContain("France — Iran")
    expect(html).toContain("Initial score 0")
    expect(html).toContain("verdict-war")
    expect(html).toContain("WAR")
  })

  it("labels a peaceful run as PEACE", () => {
    expect(playback(10)).toContain("PEACE")
  })

  it("has play/pause, reset, speed, and scrubber controls", () => {
    const html = playback(4)

    expect(html).toContain('aria-label="Play playback"')
    expect(html).toContain('aria-label="Reset playback"')
    expect(html).toContain('aria-label="Playback speed"')
    expect(html).toContain('aria-label="Round scrubber"')
    expect(html).toContain('min="1"')
    expect(html).toContain('max="50"')
    expect(html).toContain("0.5×")
    expect(html).toContain("1×")
    expect(html).toContain("2×")
    expect(html).toContain("4×")
  })

  it("starts paused at round 1 with the round readout", () => {
    const html = playback(4)

    expect(html).toContain("Round 1/50")
    expect(html).toContain("pts")
    expect(html).not.toContain("Pause")
  })

  it("mounts the recharts trajectory container", () => {
    expect(playback(4)).toContain("recharts-responsive-container")
  })
})
