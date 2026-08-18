import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import PairingPlayback from "./PairingPlayback"
import { simulate } from "../sim/engine"
import { pairingOf } from "../domain/pairing"

const france = { id: "250", name: "فرانسه" }
const iran = { id: "364", name: "ایران" }
const pairing = pairingOf(france, iran)

/** Render a card and strip SSR comment separators for clean matching. */
function playback(score: number, rationale?: string) {
  return renderToString(
    <PairingPlayback simulation={simulate(pairing, score)} rationale={rationale} />,
  ).replaceAll("<!-- -->", "")
}

describe("PairingPlayback", () => {
  it("shows the Pairing, its initial and final score, and the Verdict", () => {
    const html = playback(0)

    expect(html).toContain("ایران — فرانسه")
    expect(html).toContain("امتیاز اولیه 0")
    expect(html).toContain("verdict-war")
    expect(html).toContain("جنگ")
  })

  it("labels a peaceful run as PEACE", () => {
    expect(playback(10)).toContain("آرامش")
  })

  it("has play/pause, reset, speed, and scrubber controls", () => {
    const html = playback(4)

    expect(html).toContain('aria-label="پخش"')
    expect(html).toContain('aria-label="بازنشانی پخش"')
    expect(html).toContain('aria-label="سرعت پخش"')
    expect(html).toContain('aria-label="مرور دورها"')
    expect(html).toContain('min="1"')
    expect(html).toContain('max="50"')
    expect(html).toContain("0.5×")
    expect(html).toContain("1×")
    expect(html).toContain("2×")
    expect(html).toContain("4×")
  })

  it("starts paused at round 1 with the round readout", () => {
    const html = playback(4)

    expect(html).toContain("دور 1/50")
    expect(html).toContain("امتیاز")
    expect(html).not.toContain("توقف")
  })

  it("mounts the recharts trajectory container", () => {
    expect(playback(4)).toContain("recharts-responsive-container")
  })

  it("shows the LLM rationale under the header when provided", () => {
    expect(playback(4, "رقبای دیرینه بر سر خلیج فارس.")).toContain(
      "رقبای دیرینه بر سر خلیج فارس.",
    )
    expect(playback(4)).not.toContain("playback-rationale")
  })
})
