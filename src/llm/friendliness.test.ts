import { describe, expect, it } from "vitest"
import type { Country } from "../domain/country"
import { pairingOf } from "../domain/pairing"
import type { Settings } from "../settings/settings"
import { fetchFriendliness, type FetchLike } from "./friendliness"

const country = (id: string, name: string): Country => ({ id, name })

const iran = country("364", "Iran")
const france = country("250", "France")

const settings: Settings = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "sk-secret",
  model: "gpt-4o-mini",
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

describe("fetchFriendliness request shape", () => {
  it("POSTs once to {base URL}/chat/completions with JSON mode and both country names", async () => {
    const { fetch, requests } = fakeFetch([completion('{"score": 5, "rationale": "Neutral."}')])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

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
    expect(body.messages.some((m) => m.content.includes("Iran") && m.content.includes("France"))).toBe(
      true,
    )
    expect(outcome).toEqual({ ok: true, result: { score: 5, rationale: "Neutral." } })
  })

  it("sends the API key only in the Authorization header to the configured endpoint", async () => {
    const { fetch, requests } = fakeFetch([completion('{"score": 5, "rationale": "Neutral."}')])

    await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    const headers = requests[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer sk-secret")
    expect(requests[0].url).toContain(settings.baseUrl)
  })

  it("accepts scheme-less base URLs by assuming https, and trims trailing slashes", async () => {
    const { fetch, requests } = fakeFetch([completion('{"score": 5, "rationale": "Neutral."}')])

    await fetchFriendliness(
      { ...settings, baseUrl: "my-proxy.internal:9000/v1/" },
      pairingOf(iran, france),
      fetch,
    )

    expect(requests[0].url).toBe("https://my-proxy.internal:9000/v1/chat/completions")
  })
})

describe("fetchFriendliness validation before any request", () => {
  it("fails without fetching when the API key is missing", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchFriendliness(
      { ...settings, apiKey: "" },
      pairingOf(iran, france),
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("کلید API")
    expect(requests).toHaveLength(0)
  })

  it("fails without fetching when no model is configured", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchFriendliness(
      { ...settings, model: "" },
      pairingOf(iran, france),
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("مدل")
    expect(requests).toHaveLength(0)
  })

  it("fails without fetching when the base URL cannot be parsed", async () => {
    const { fetch, requests } = fakeFetch([])

    const outcome = await fetchFriendliness(
      { ...settings, baseUrl: "http://exa mple.com/v1" },
      pairingOf(iran, france),
      fetch,
    )

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("آدرس پایه")
    expect(requests).toHaveLength(0)
  })
})

describe("fetchFriendliness failure reporting", () => {
  it("reports the status and endpoint message on an API error", async () => {
    const { fetch } = fakeFetch([
      jsonResponse({ error: { message: "Invalid authorization credential" } }, 401),
    ])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

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

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toContain("دسترسی به")
  })

  it("never leaks the API key in any error message", async () => {
    const cases: Response[] = [
      jsonResponse({ error: { message: "Invalid authorization credential" } }, 401),
      jsonResponse("plain text", 500),
      completion("not json at all"),
      completion('{"score": 99, "rationale": "out of range"}'),
      completion('{"score": 5}'),
      jsonResponse({ nope: true }),
    ]
    for (const response of cases) {
      const { fetch } = fakeFetch([response])
      const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) expect(outcome.error).not.toContain("sk-secret")
    }
  })
})

describe("fetchFriendliness response parsing", () => {
  it("accepts a whole-number score with a rationale", async () => {
    const { fetch } = fakeFetch([completion('{"score": 8, "rationale": "Steady partners."}')])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome).toEqual({ ok: true, result: { score: 8, rationale: "Steady partners." } })
  })

  it("rounds a decimal score to the nearest whole number", async () => {
    const { fetch } = fakeFetch([completion('{"score": 7.4, "rationale": "Broadly friendly."}')])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome).toEqual({ ok: true, result: { score: 7, rationale: "Broadly friendly." } })
  })

  it("rejects a score outside 0–10", async () => {
    const { fetch } = fakeFetch([completion('{"score": 12, "rationale": "Too kind."}')])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome.ok).toBe(false)
  })

  it("rejects a missing rationale", async () => {
    const { fetch } = fakeFetch([completion('{"score": 5}')])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome.ok).toBe(false)
  })

  it("recovers JSON wrapped in markdown fences", async () => {
    const { fetch } = fakeFetch([
      completion('```json\n{"score": 2, "rationale": "Border tensions."}\n```'),
    ])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome).toEqual({ ok: true, result: { score: 2, rationale: "Border tensions." } })
  })

  it("rejects a response body that is not JSON", async () => {
    const { fetch } = fakeFetch([new Response("gateway timeout", { status: 200 })])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome.ok).toBe(false)
  })

  it("parses a completion from an SSE streamed response body", async () => {
    const sseBody =
      '\n\n{"id":"gen-1","object":"chat.completion","created":1,"model":"deepseek/1","choices":[{"index":0,"message":{"role":"assistant","content":"{\\"score\\": 7, \\"rationale\\": \\"Steady partners.\\"}"}}],"usage":{}}data: [DONE]\n\n'
    const { fetch } = fakeFetch([
      new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    ])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome).toEqual({ ok: true, result: { score: 7, rationale: "Steady partners." } })
  })

  it("parses a completion from a properly-framed SSE body", async () => {
    const sseBody =
      'data: {"choices":[{"message":{"content":"{\\"score\\": 4, \\"rationale\\": \\"Wary neighbors.\\"}"}}]}\n\ndata: [DONE]\n'
    const { fetch } = fakeFetch([
      new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    ])

    const outcome = await fetchFriendliness(settings, pairingOf(iran, france), fetch)

    expect(outcome).toEqual({ ok: true, result: { score: 4, rationale: "Wary neighbors." } })
  })
})
