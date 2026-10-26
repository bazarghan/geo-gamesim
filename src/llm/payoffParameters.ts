import { translate, type Language } from "../i18n"
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
  "شما یک تحلیلگر ژئوپلیتیک هستید. پارامترهای بازده برای کشورها در یک درگیری " +
  "تولید می‌کنید و همیشه فقط با یک شیء JSON پاسخ می‌دهید، نه چیز دیگری."

const USER_PROMPT_TEMPLATE = `کشور {country} را در این سناریوی درگیری تحلیل کن:
{context}

پارامترهای بازده این کشور را برای مدل نظریه بازی تولید کن:

- affinitySideA: میزان هم‌راستی این کشور با سمت A، عدد صحیح 0-10
- affinitySideB: میزان هم‌راستی این کشور با سمت B، عدد صحیح 0-10
- neutralityValue: ارزش ذاتی که این کشور برای بی‌طرف ماندن قائل است، عدد صحیح 0-10
- powerWeight: میزان نفوذی که این کشور به بلوکی که به آن می‌پیوندد می‌افزاید، عدد صحیح 0-10

فقط با یک شیء JSON و دقیقاً به این شکل پاسخ بده:
{{"affinitySideA": <عدد 0-10>, "affinitySideB": <عدد 0-10>, "neutralityValue": <عدد 0-10>, "powerWeight": <عدد 0-10>, "rationale": "<یک جمله به فارسی که این پارامترها را توضیح می‌دهد>"}}`

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
  language: Language = "fa",
): Promise<PayoffOutcome> {
  if (settings.apiKey === "") {
    return failure("کلید API وجود ندارد — در تنظیمات یک کلید اضافه کنید.", language)
  }
  if (settings.model === "") {
    return failure("مدلی تنظیم نشده — در تنظیمات یک مدل تعیین کنید.", language)
  }

  let endpoint: string
  try {
    endpoint = chatCompletionsUrl(settings.baseUrl)
  } catch {
    return failure(
      translate(
        "نمی‌توان از آدرس پایه «{url}» استفاده کرد — آن را در تنظیمات اصلاح کنید.",
        language,
        { url: settings.baseUrl },
      ),
      language,
    )
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
          {
            role: "system",
            content:
              language === "en"
                ? "You are a geopolitical analyst. Generate game-theoretic payoff parameters and return only a JSON object. Write the rationale in English."
                : SYSTEM_PROMPT,
          },
          {
            role: "user",
            content:
              language === "en"
                ? `Analyze ${countryName} in this conflict: ${context}. Return only JSON with affinitySideA, affinitySideB, neutralityValue and powerWeight (all numbers 0-10), and rationale (one sentence in English). Affinities measure alignment with each side, neutralityValue measures the value of staying out, and powerWeight measures influence contributed to a bloc.`
                : USER_PROMPT_TEMPLATE.replace("{country}", countryName).replace(
                    "{context}",
                    context,
                  ),
          },
        ],
      }),
    })
  } catch {
    return failure(
      translate("دسترسی به {url} ممکن نشد — آدرس پایه را در تنظیمات بررسی کنید.", language, {
        url: endpoint,
      }),
      language,
    )
  }

  if (!response.ok) {
    return failure(
      `${translate("خطای API", language)} ${response.status}: ${await apiErrorMessage(response, language)}`,
      language,
    )
  }

  return parseContent(response, language)
}

/** `https://example.com/v1` → `https://example.com/v1/chat/completions`. */
function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`
  const url = new URL(`${withScheme}/chat/completions`)
  return url.toString()
}

async function parseContent(response: Response, language: Language): Promise<PayoffOutcome> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return failure("پاسخ سرور قابل خواندن به‌صورت JSON نبود.", language)
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    const fenced = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
    try {
      payload = JSON.parse(fenced)
    } catch {
      return failure("پاسخ سرور قابل خواندن به‌صورت JSON نبود.", language)
    }
  }

  const content = contentText(payload)
  if (content === null) {
    return failure("پاسخ سرور محتوای پیام نداشت.", language)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    const fenced = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)
    try {
      parsed = JSON.parse(fenced)
    } catch {
      return failure("مدل خروجی JSON معتبر نداد — دوباره تلاش کنید یا مدل را عوض کنید.", language)
    }
  }

  const candidate = parsed as Partial<PayoffParameters> & { rationale?: unknown }
  const fields = [candidate.affinitySideA, candidate.affinitySideB, candidate.neutralityValue]
  if (!fields.every(isFiniteNumber)) {
    return failure("مدل پارامترهای نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.", language)
  }
  if (!isFiniteNumber(candidate.powerWeight)) {
    return failure("مدل پارامترهای نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.", language)
  }
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") {
    return failure("مدل توضیح نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.", language)
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
async function apiErrorMessage(response: Response, language: Language): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } }
    const message = body?.error?.message
    return typeof message === "string" && message.length > 0
      ? message
      : translate("درخواست ناموفق", language)
  } catch {
    return translate("درخواست ناموفق", language)
  }
}

function failure(error: string, language: Language): PayoffOutcome {
  return { ok: false, error: translate(error, language) }
}
