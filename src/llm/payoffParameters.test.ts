import { describe, expect, it } from "vitest"
import type { Settings } from "../settings/settings"
import { fetchPayoffParameters, type FetchLike } from "./payoffParameters"

const settings: Settings = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-secret",
  model: "gpt-4o-mini",
}

const fullResult = {
  affinitySideA: 8,
  affinitySideB: 2,
  neutralityValue: 4,
  powerWeight: 7,
  rationale: "Firmly aligned with the regional bloc.",
}

type CapturedRequest = { url: string; init: RequestInit }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function completion(content: unknown): Response {
  return jsonResponse({ choices: [{ message: { content } }] })
}

/** A fetch stand-in that records the request and replies with scripted responses. */
function fakeFetch(responses: Response[]): { fetch: FetchLike; requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = []
  let call = 0
  return {
    requests,
    fetch: (url, init) => {
      requests.push({ url, init })
      const response = responses[call]
      call += 1
      if (response === undefined) throw new Error("unexpected extra fetch call")
      return Promise.resolve(response)
    },
  }
}

const context = "Iran vs Saudi Arabia, with Turkey as a possible side-picker."

describe("fetchPayoffParameters request shape", () => {
  it("POSTs once to {base URL}/chat/completions with JSON mode and the country name", async () => {
    const { fetch, requests } = fakeFetch([completion(JSON.stringify(fullResult))])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe("https://openrouter.ai/api/v1/chat/completions")
    expect(requests[0].init.method).toBe("POST")

    const body = JSON.parse(requests[0].init.body as string) as {
      model: string
      response_format: { type: string }
      messages: { role: string; content: string }[]
    }
    expect(body.model).toBe("gpt-4o-mini")
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.messages.some((m) => m.content.includes("Turkey"))).toBe(true)
    expect(outcome.ok).toBe(true)
  })

  it("sends the API key only in the Authorization header to the configured endpoint", async () => {
    const { fetch, requests } = fakeFetch([completion(JSON.stringify(fullResult))])

    await fetchPayoffParameters(settings, "Turkey", context, fetch)

    const headers = requests[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer sk-secret")
    expect(requests[0].url).toContain(settings.baseUrl)
  })
})

describe("fetchPayoffParameters validation before any request", () => {
  it("fails without fetching when the API key is missing", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchPayoffParameters(
      { ...settings, apiKey: "" },
      "Turkey",
      context,
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("API key")
    expect(requests).toHaveLength(0)
  })

  it("fails without fetching when no model is configured", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchPayoffParameters(
      { ...settings, model: "" },
      "Turkey",
      context,
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("model")
    expect(requests).toHaveLength(0)
  })

  it("fails without fetching when the base URL cannot be parsed", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchPayoffParameters(
      { ...settings, baseUrl: "http://exa mple.com/v1" },
      "Turkey",
      context,
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("base URL")
    expect(requests).toHaveLength(0)
  })
})

describe("fetchPayoffParameters failure reporting", () => {
  it("reports the status and endpoint message on an API error", async () => {
    const { fetch } = fakeFetch([
      jsonResponse({ error: { message: "Invalid authorization credential" } }, 401),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.error).toContain("401")
      expect(outcome.error).toContain("Invalid authorization credential")
    }
  })

  it("reports an unreachable endpoint when fetch throws", async () => {
    const requests: CapturedRequest[] = []
    const fetch: FetchLike = (url, init) => {
      requests.push({ url, init })
      return Promise.reject(new TypeError("Failed to fetch"))
    }

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("Could not reach")
  })

  it("never leaks the API key in any error message", async () => {
    const cases: Response[] = [
      jsonResponse({ error: { message: "Invalid authorization credential" } }, 401),
      jsonResponse("plain text", 500),
      completion("not json at all"),
      completion('{"affinitySideA": "high"}'),
      completion('{"affinitySideA": 8, "affinitySideB": 2, "neutralityValue": 4}'),
      jsonResponse({ nope: true }),
    ]
    for (const response of cases) {
      const { fetch } = fakeFetch([response])
      const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).not.toContain("sk-secret")
    }
  })
})

describe("fetchPayoffParameters response parsing and clamping", () => {
  it("accepts valid parameters and a rationale", async () => {
    const { fetch } = fakeFetch([completion(JSON.stringify(fullResult))])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome).toEqual({
      ok: true,
      result: {
        parameters: {
          affinitySideA: 8,
          affinitySideB: 2,
          neutralityValue: 4,
          powerWeight: 7,
        },
        rationale: "Firmly aligned with the regional bloc.",
      },
    })
  })

  it("clamps out-of-range parameter values into the 0–10 range", async () => {
    const { fetch } = fakeFetch([
      completion(
        JSON.stringify({
          affinitySideA: -5,
          affinitySideB: 12,
          neutralityValue: 50,
          powerWeight: -1,
          rationale: "Extreme.",
        }),
      ),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome).toEqual({
      ok: true,
      result: {
        parameters: { affinitySideA: 0, affinitySideB: 10, neutralityValue: 10, powerWeight: 0 },
        rationale: "Extreme.",
      },
    })
  })

  it("rounds decimal parameters to two decimals", async () => {
    const { fetch } = fakeFetch([
      completion(
        JSON.stringify({
          affinitySideA: 7.777,
          affinitySideB: 2,
          neutralityValue: 4.5,
          powerWeight: 9.123,
          rationale: "Roughly aligned.",
        }),
      ),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome).toEqual({
      ok: true,
      result: {
        parameters: { affinitySideA: 7.78, affinitySideB: 2, neutralityValue: 4.5, powerWeight: 9.12 },
        rationale: "Roughly aligned.",
      },
    })
  })

  it("rejects a malformed parameter (non-number)", async () => {
    const { fetch } = fakeFetch([
      completion('{"affinitySideA": "high", "affinitySideB": 2, "neutralityValue": 4, "powerWeight": 7, "rationale": "x"}'),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
  })

  it("rejects a missing parameter", async () => {
    const { fetch } = fakeFetch([
      completion('{"affinitySideA": 8, "affinitySideB": 2, "neutralityValue": 4, "rationale": "x"}'),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
  })

  it("rejects a missing rationale", async () => {
    const { fetch } = fakeFetch([
      completion('{"affinitySideA": 8, "affinitySideB": 2, "neutralityValue": 4, "powerWeight": 7}'),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
  })

  it("recovers JSON wrapped in markdown fences", async () => {
    const { fetch } = fakeFetch([
      completion(`\`\`\`json\n${JSON.stringify(fullResult)}\n\`\`\``),
    ])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(true)
  })

  it("rejects a response body that is not JSON", async () => {
    const { fetch } = fakeFetch([new Response("gateway timeout", { status: 200 })])

    const outcome = await fetchPayoffParameters(settings, "Turkey", context, fetch)

    expect(outcome.ok).toBe(false)
  })
})
