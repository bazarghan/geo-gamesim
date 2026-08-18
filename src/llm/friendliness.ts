import type { Pairing } from "../domain/pairing"
import type { Settings } from "../settings/settings"
import type { FriendlinessResult } from "./scoreCache"

/** Injectable fetch seam so tests never touch the network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type FriendlinessOutcome =
  | { readonly ok: true; readonly result: FriendlinessResult }
  | { readonly ok: false; readonly error: string }

const SYSTEM_PROMPT =
  "You are a geopolitical analyst. You rate bilateral country relationships " +
  "and always answer with a single JSON object, nothing else."

const USER_PROMPT_TEMPLATE = `Rate the friendliness of the relationship between two countries.

Countries: {left} and {right}

The friendliness score is a whole number from 0 (open hostility) to 10 (deep
alliance). The relationship is symmetric — one score covers both directions.

Respond with a single JSON object in exactly this shape:
{{"score": <whole number 0-10>, "rationale": "<one sentence explaining the score>"}}`

/**
 * Query the configured OpenAI-compatible endpoint for one Pairing's
 * Friendliness Score and rationale, via JSON mode. The API key is sent only
 * to the configured base URL and never appears in errors or logs.
 */
export async function fetchFriendliness(
  settings: Settings,
  pairing: Pairing,
  fetchFn: FetchLike = fetch,
): Promise<FriendlinessOutcome> {
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
            content: USER_PROMPT_TEMPLATE.replace("{left}", pairing.left.name).replace(
              "{right}",
              pairing.right.name,
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

async function parseContent(response: Response): Promise<FriendlinessOutcome> {
  let payload: unknown
  try {
    payload = (await response.json()) as { choices?: unknown }
  } catch {
    return failure("The endpoint returned a non-JSON response body.")
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

  const candidate = parsed as Partial<FriendlinessResult>
  if (
    typeof candidate.score !== "number" ||
    !Number.isFinite(candidate.score) ||
    candidate.score < 0 ||
    candidate.score > 10 ||
    typeof candidate.rationale !== "string" ||
    candidate.rationale.trim() === ""
  ) {
    return failure("The model returned an invalid score or rationale — try again or switch models.")
  }

  return { ok: true, result: { score: Math.round(candidate.score), rationale: candidate.rationale.trim() } }
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

function failure(error: string): FriendlinessOutcome {
  return { ok: false, error }
}
