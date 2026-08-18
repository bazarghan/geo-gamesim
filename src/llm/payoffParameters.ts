import type { PayoffParameters } from "../domain/gameEngine"
import { clampPayoffParameters } from "../domain/gameEngine"
import type { Settings } from "../settings/settings"
import type { PayoffParametersResult } from "./payoffCache"

/** Injectable fetch seam so tests never touch the network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type PayoffOutcome =
  | { readonly ok: true; readonly result: PayoffParametersResult }
  | { readonly ok: false; readonly error: string }

const SYSTEM_PROMPT =
  "You are a geopolitical analyst. You produce payoff parameters for countries " +
  "in a conflict and always answer with a single JSON object, nothing else."

const USER_PROMPT_TEMPLATE = `Analyze the country {country} within this conflict scenario:
{context}

Produce that country's payoff parameters for the game-theoretic model:

- affinitySideA: how closely aligned this country is with Side A, whole number 0-10
- affinitySideB: how closely aligned this country is with Side B, whole number 0-10
- neutralityValue: the intrinsic value this country places on staying out, whole number 0-10
- powerWeight: how much influence this country contributes to a bloc it joins, whole number 0-10

Respond with a single JSON object in exactly this shape:
{{"affinitySideA": <number 0-10>, "affinitySideB": <number 0-10>, "neutralityValue": <number 0-10>, "powerWeight": <number 0-10>, "rationale": "<one sentence explaining these parameters>"}}`

/**
 * Query the configured OpenAI-compatible endpoint for one Party's Payoff
 * Parameters and rationale, via JSON mode. The API key is sent only to the
 * configured base URL and never appears in errors or logs.
 */
export async function fetchPayoffParameters(
  settings: Settings,
  countryName: string,
  context: string,
  fetchFn: FetchLike = fetch,
): Promise<PayoffOutcome> {
  if (settings.apiKey === "") {
    return failure("Missing API key — add one in Settings.")
  }
  if (settings.model === "") {
    return failure("No model configured — set one in Settings.")
  }

  let endpoint: string
  try {
    endpoint = chatCompletionsUrl(settings.baseUrl)
  } catch {
    return failure(`Cannot use base URL "${settings.baseUrl}" — fix it in Settings.`)
  }

  let response: Response
  try {
    response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: USER_PROMPT_TEMPLATE.replace("{country}", countryName).replace(
              "{context}",
              context,
            ),
          },
        ],
      }),
    })
  } catch {
    return failure(`Could not reach ${endpoint} — check the base URL in Settings.`)
  }

  if (!response.ok) {
    return failure(`API error ${response.status}: ${await apiErrorMessage(response)}`)
  }

  return parseContent(response)
}

/** `https://example.com/v1` → `https://example.com/v1/chat/completions`. */
function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`
  const url = new URL(`${withScheme}/chat/completions`)
  return url.toString()
}

async function parseContent(response: Response): Promise<PayoffOutcome> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return failure("The endpoint returned a non-JSON response body.")
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    const fenced = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    try {
      payload = JSON.parse(fenced)
    } catch {
      return failure("The endpoint returned a non-JSON response body.")
    }
  }

  const content = contentText(payload)
  if (content === null) {
    return failure("The endpoint response had no message content.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    const fenced = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)
    try {
      parsed = JSON.parse(fenced)
    } catch {
      return failure("The model did not return valid JSON — try again or switch models.")
    }
  }

  const candidate = parsed as Partial<PayoffParameters> & { rationale?: unknown }
  const fields = [candidate.affinitySideA, candidate.affinitySideB, candidate.neutralityValue]
  if (!fields.every(isFiniteNumber)) {
    return failure("The model returned invalid parameters — try again or switch models.")
  }
  if (!isFiniteNumber(candidate.powerWeight)) {
    return failure("The model returned invalid parameters — try again or switch models.")
  }
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") {
    return failure("The model returned an invalid rationale — try again or switch models.")
  }

  return {
    ok: true,
    result: {
      parameters: clampPayoffParameters({
        affinitySideA: candidate.affinitySideA as number,
        affinitySideB: candidate.affinitySideB as number,
        neutralityValue: candidate.neutralityValue as number,
        powerWeight: candidate.powerWeight as number,
      }),
      rationale: candidate.rationale.trim(),
    },
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function contentText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const message = (choices[0] as { message?: unknown }).message
  if (typeof message !== "object" || message === null) return null
  const content = (message as { content?: unknown }).content
  return typeof content === "string" && content.length > 0 ? content : null
}

/** Best-effort extraction of the endpoint's own error message, key-free. */
async function apiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } }
    const message = body?.error?.message
    return typeof message === "string" && message.length > 0 ? message : "request failed"
  } catch {
    return "request failed"
  }
}

function failure(error: string): PayoffOutcome {
  return { ok: false, error }
}
