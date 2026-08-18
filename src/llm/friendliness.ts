import type { Pairing } from "../domain/pairing"
import type { Settings } from "../settings/settings"
import type { FriendlinessResult } from "./scoreCache"

/** Injectable fetch seam so tests never touch the network. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type FriendlinessOutcome =
  | { readonly ok: true; readonly result: FriendlinessResult }
  | { readonly ok: false; readonly error: string }

const SYSTEM_PROMPT =
  "شما یک تحلیلگر ژئوپلیتیک هستید. روابط دوجانبه بین کشورها را ارزیابی می‌کنید " +
  "و همیشه فقط با یک شیء JSON پاسخ می‌دهید، نه چیز دیگری."

const USER_PROMPT_TEMPLATE = `میزان دوستی رابطه بین دو کشور را ارزیابی کن.

کشورها: {left} و {right}

نمره دوستی یک عدد صحیح از 0 (خصومت آشکار) تا 10 (اتحاد عمیق) است. رابطه متقارن است — یک نمره برای هر دو جهت.

فقط با یک شیء JSON و دقیقاً به این شکل پاسخ بده:
{{"score": <عدد صحیح 0-10>, "rationale": "<یک جمله به فارسی که نمره را توضیح می‌دهد>"}}`

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
    return failure("کلید API وجود ندارد — در تنظیمات یک کلید اضافه کنید.")
  }
  if (settings.model === "") {
    return failure("مدلی تنظیم نشده — در تنظیمات یک مدل تعیین کنید.")
  }

  let endpoint: string
  try {
    endpoint = chatCompletionsUrl(settings.baseUrl)
  } catch {
    return failure(`نمی‌توان از آدرس پایه «${settings.baseUrl}» استفاده کرد — آن را در تنظیمات اصلاح کنید.`)
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
    return failure(`دسترسی به ${endpoint} ممکن نشد — آدرس پایه را در تنظیمات بررسی کنید.`)
  }

  if (!response.ok) {
    return failure(`خطای API ${response.status}: ${await apiErrorMessage(response)}`)
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
  let text: string
  try {
    text = await response.text()
  } catch {
    return failure("پاسخ سرور قابل خواندن به‌صورت JSON نبود.")
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    const fenced = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    try {
      payload = JSON.parse(fenced)
    } catch {
      return failure("پاسخ سرور قابل خواندن به‌صورت JSON نبود.")
    }
  }

  const content = contentText(payload)
  if (content === null) {
    return failure("پاسخ سرور محتوای پیام نداشت.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    const fenced = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)
    try {
      parsed = JSON.parse(fenced)
    } catch {
      return failure("مدل خروجی JSON معتبر نداد — دوباره تلاش کنید یا مدل را عوض کنید.")
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
    return failure("مدل نمره یا توضیح نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.")
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
    return typeof message === "string" && message.length > 0 ? message : "درخواست ناموفق"
  } catch {
    return "درخواست ناموفق"
  }
}

function failure(error: string): FriendlinessOutcome {
  return { ok: false, error }
}
