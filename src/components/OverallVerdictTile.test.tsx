import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import OverallVerdictTile from "./OverallVerdictTile"

describe("OverallVerdictTile", () => {
  it("announces the Overall Verdict", () => {
    const html = renderToString(<OverallVerdictTile verdict="TENSION" />).replaceAll("<!-- -->", "")

    expect(html).toContain("داوری کلی")
    expect(html).toContain("تنش")
    expect(html).toContain("overall-tension")
  })

  it("styles each verdict distinctly", () => {
    expect(renderToString(<OverallVerdictTile verdict="PEACE" />)).toContain("overall-peace")
    expect(renderToString(<OverallVerdictTile verdict="WAR" />)).toContain("overall-war")
  })
})
