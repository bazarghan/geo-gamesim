/** Persian (فارسی) display labels for domain values rendered in the UI. */

export const VERDICT_LABELS: Readonly<Record<string, string>> = {
  PEACE: "آرامش",
  "COLD WAR": "جنگ سرد",
  WAR: "جنگ",
  TENSION: "تنش",
}

/** A Pairing Verdict (e.g. "PEACE") as a Persian label. */
export function verdictLabel(verdict: string): string {
  return VERDICT_LABELS[verdict] ?? verdict
}

export const ARCHETYPE_LABELS: Readonly<Record<string, string>> = {
  Aggressive: "متهاجم",
  Suspicious: "مشکوک",
  Reciprocator: "متقابل",
  "Cautious Cooperator": "همکار محتاط",
  "Loyal Ally": "متحد وفادار",
}

/** A Strategy Archetype (e.g. "Aggressive") as a Persian label. */
export function archetypeLabel(archetype: string): string {
  return ARCHETYPE_LABELS[archetype] ?? archetype
}

export const ALIGNMENT_LABELS: Readonly<Record<string, string>> = {
  "SIDE A": "سمت A",
  "SIDE B": "سمت B",
  NEUTRAL: "بی‌طرف",
}

/** An Alignment (e.g. "SIDE A") as a Persian label. */
export function alignmentLabel(alignment: string): string {
  return ALIGNMENT_LABELS[alignment] ?? alignment
}

export const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  "mutual cooperation": "همکاری دوجانبه",
  mixed: "مختلط",
  "mutual defection": "تخلف دوجانبه",
}

/** A Round outcome (e.g. "mutual cooperation") as a Persian label. */
export function outcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? outcome
}

/** The Persian verb for a Move in the round readout/tooltip. */
export function moveVerb(move: string): string {
  return move === "cooperate" ? "همکاری می‌کند" : "تخلف می‌کند"
}

export const COUNTRY_NAMES_FA: Readonly<Record<string, string>> = {
  Afghanistan: "افغانستان",
  Albania: "آلبانی",
  Algeria: "الجزایر",
  Angola: "آنگولا",
  Argentina: "آرژانتین",
  Armenia: "ارمنستان",
  Australia: "استرالیا",
  Austria: "اتریش",
  Azerbaijan: "آذربایجان",
  Bahamas: "باهاما",
  Bangladesh: "بنگلادش",
  Belarus: "بلاروس",
  Belgium: "بلژیک",
  Belize: "بلیز",
  Benin: "بنین",
  Bhutan: "بوتان",
  Bolivia: "بولیوی",
  "Bosnia and Herz.": "بوسنی و هرزگوین",
  Botswana: "بوتسوانا",
  Brazil: "برزیل",
  Brunei: "برونئی",
  Bulgaria: "بلغارستان",
  "Burkina Faso": "بورکینافاسو",
  Burundi: "بوروندی",
  Cambodia: "کامبوج",
  Cameroon: "کامرون",
  Canada: "کانادا",
  "Central African Rep.": "جمهوری آفریقای مرکزی",
  Chad: "چاد",
  Chile: "شیلی",
  China: "چین",
  Colombia: "کلمبیا",
  Congo: "جمهوری کنگو",
  "Costa Rica": "کاستاریکا",
  Croatia: "کرواسی",
  Cuba: "کوبا",
  Cyprus: "قبرس",
  Czechia: "جمهوری چک",
  "Côte d'Ivoire": "ساحل عاج",
  "Dem. Rep. Congo": "جمهوری دموکراتیک کنگو",
  Denmark: "دانمارک",
  Djibouti: "جیبوتی",
  "Dominican Rep.": "جمهوری دومینیکن",
  Ecuador: "اکوادور",
  Egypt: "مصر",
  "El Salvador": "السالوادور",
  "Eq. Guinea": "گینه استوایی",
  Eritrea: "اریتره",
  Estonia: "استونی",
  Ethiopia: "اتیوپی",
  "Falkland Is.": "جزایر فالکلند",
  Fiji: "فیجی",
  Finland: "فنلاند",
  "Fr. S. Antarctic Lands": "سرزمین‌های جنوبی فرانسه",
  France: "فرانسه",
  Gabon: "گابن",
  Gambia: "گامبیا",
  Georgia: "گرجستان",
  Germany: "آلمان",
  Ghana: "غنا",
  Greece: "یونان",
  Greenland: "گرینلند",
  Guatemala: "گواتمالا",
  Guinea: "گینه",
  "Guinea-Bissau": "گینه بیسائو",
  Guyana: "گویان",
  Haiti: "هائیتی",
  Honduras: "هندوراس",
  Hungary: "مجارستان",
  Iceland: "ایسلند",
  India: "هند",
  Indonesia: "اندونزی",
  Iran: "ایران",
  Iraq: "عراق",
  Ireland: "ایرلند",
  Israel: "اسرائیل",
  Italy: "ایتالیا",
  Jamaica: "جامائیکا",
  Japan: "ژاپن",
  Jordan: "اردن",
  Kazakhstan: "قزاقستان",
  Kenya: "کنیا",
  Kosovo: "کوزوو",
  Kuwait: "کویت",
  Kyrgyzstan: "قرقیزستان",
  Laos: "لائوس",
  Latvia: "لتونی",
  Lebanon: "لبنان",
  Lesotho: "لسوتو",
  Liberia: "لیبریا",
  Libya: "لیبی",
  Lithuania: "لیتوانی",
  Luxembourg: "لوکزامبورگ",
  Macedonia: "مقدونیه شمالی",
  Madagascar: "ماداگاسکار",
  Malawi: "مالاوی",
  Malaysia: "مالزی",
  Mali: "مالی",
  Mauritania: "موریتانی",
  Mexico: "مکزیک",
  Moldova: "مولداوی",
  Mongolia: "مغولستان",
  Montenegro: "مونته‌نگرو",
  Morocco: "مراکش",
  Mozambique: "موزامبیک",
  Myanmar: "میانمار",
  "N. Cyprus": "قبرس شمالی",
  Namibia: "نامیبیا",
  Nepal: "نپال",
  Netherlands: "هلند",
  "New Caledonia": "کالدونیای جدید",
  "New Zealand": "نیوزیلند",
  Nicaragua: "نیکاراگوئه",
  Niger: "نیجر",
  Nigeria: "نیجریه",
  "North Korea": "کره شمالی",
  Norway: "نروژ",
  Oman: "عمان",
  Pakistan: "پاکستان",
  Palestine: "فلسطین",
  Panama: "پاناما",
  "Papua New Guinea": "پاپوآ گینه نو",
  Paraguay: "پاراگوئه",
  Peru: "پرو",
  Philippines: "فیلیپین",
  Poland: "لهستان",
  Portugal: "پرتغال",
  "Puerto Rico": "پورتوریکو",
  Qatar: "قطر",
  Romania: "رومانی",
  Russia: "روسیه",
  Rwanda: "رواندا",
  "S. Sudan": "سودان جنوبی",
  "Saudi Arabia": "عربستان سعودی",
  Senegal: "سنگال",
  Serbia: "صربستان",
  "Sierra Leone": "سیرالئون",
  Slovakia: "اسلواکی",
  Slovenia: "اسلوونی",
  "Solomon Is.": "جزایر سلیمان",
  Somalia: "سومالی",
  Somaliland: "سومالی‌لند",
  "South Africa": "آفریقای جنوبی",
  "South Korea": "کره جنوبی",
  Spain: "اسپانیا",
  "Sri Lanka": "سری‌لانکا",
  Sudan: "سودان",
  Suriname: "سورینام",
  Sweden: "سوئد",
  Switzerland: "سوئیس",
  Syria: "سوریه",
  Taiwan: "تایوان",
  Tajikistan: "تاجیکستان",
  Tanzania: "تانزانیا",
  Thailand: "تایلند",
  "Timor-Leste": "تیمور شرقی",
  Togo: "توگو",
  "Trinidad and Tobago": "ترینیداد و توباگو",
  Tunisia: "تونس",
  Turkey: "ترکیه",
  Turkmenistan: "ترکمنستان",
  Uganda: "اوگاندا",
  Ukraine: "اوکراین",
  "United Arab Emirates": "امارات متحده عربی",
  "United Kingdom": "بریتانیا",
  "United States of America": "ایالات متحده آمریکا",
  Uruguay: "اروگوئه",
  Uzbekistan: "ازبکستان",
  Vanuatu: "وانواتو",
  Venezuela: "ونزوئلا",
  Vietnam: "ویتنام",
  "W. Sahara": "صحرای غربی",
  Yemen: "یمن",
  Zambia: "زامبیا",
  Zimbabwe: "زیمبابوه",
  eSwatini: "اسواتینی",
}

/** Returns the Persian name of a country if available, or the original English name. */
export function persianCountryName(englishName: string): string {
  return COUNTRY_NAMES_FA[englishName] ?? englishName
}

export type Language = "fa" | "en"

const ENGLISH_NAMES = Object.fromEntries(
  Object.entries(COUNTRY_NAMES_FA).map(([en, fa]) => [fa, en]),
)

/** Country names remain canonical in the domain; only display labels change. */
export function countryName(name: string, language: Language): string {
  const english = ENGLISH_NAMES[name] ?? name
  return language === "fa" ? persianCountryName(english) : english
}

const EN: Readonly<Record<string, string>> = {
  "شبیه‌ساز ژئوپلیتیک": "Geo GameSim",
  "حالت شبیه‌سازی": "Simulation mode",
  "شبیه‌سازی دوجانبه": "Bilateral simulation",
  "سناریوی درگیری": "Conflict scenario",
  "۲ تا ۳ کشور انتخاب کنید تا روند روابطشان شبیه‌سازی شود.":
    "Select 2–3 countries to explore how their relationships evolve.",
  "دو طرف درگیر را انتخاب کرده و طرف‌های دیگر را برای تحلیل یک سناریوی درگیری اضافه کنید.":
    "Select two belligerents, then add other countries to analyze a conflict scenario.",
  تنظیمات: "Settings",
  "آدرس پایه": "Base URL",
  "کلید API": "API key",
  "نام مدل": "Model name",
  "پاک کردن نتایج حافظه": "Clear cached results",
  بستن: "Close",
  ذخیره: "Save",
  "تنظیمات ذخیره شد": "Settings saved",
  انتخاب: "Selection",
  "{count} از {limit} کشور": "{count} of {limit} countries",
  "برای انتخاب، روی کشورها در نقشه کلیک کنید.": "Click countries on the map to select them.",
  "برای اجرای شبیه‌سازی حداقل یک کشور دیگر انتخاب کنید.":
    "Select at least one more country to run a simulation.",
  "انتخاب کامل است — برای جایگزینی روی یک کشور انتخاب‌شده کلیک کنید.":
    "Selection is full. Deselect a country to replace it.",
  "حذف {name}": "Remove {name}",
  جفت‌ها: "Pairings",
  "هر جفت نامرتب از کشورهای انتخاب‌شده یک جفت را تشکیل می‌دهد.":
    "Each unordered pair of selected countries forms a Pairing.",
  "در حال پرسش از مدل…": "Asking the model…",
  "از حافظه": "Cached",
  "اجرای شبیه‌سازی": "Run simulation",
  "دو طرف درگیر را انتخاب کنید، سپس طرف‌هایی که ممکن است جانب یکی را بگیرند اضافه کنید.":
    "Select the two belligerents, then add countries that may join a side.",
  "یک طرف درگیر دیگر انتخاب کنید.": "Select the second belligerent.",
  "برای اجرای تحلیل درگیری حداقل یک طرف دیگر اضافه کنید.":
    "Add at least one other party to run the conflict analysis.",
  "طرف درگیر": "Belligerent",
  طرف: "Party",
  بی‌طرفی: "Neutrality",
  قدرت: "Power",
  "تلاش مجدد": "Retry",
  "اجرای تحلیل درگیری": "Run conflict analysis",
  "نقشه جهان — برای انتخاب کشورها روی آن‌ها کلیک کنید":
    "World map — click countries to select them",
  "مثلث سه کشور انتخاب‌شده با یال‌هایی که رنگشان وابسته به داوری هر جفت است":
    "Three selected countries with edges colored by each Pairing verdict",
  "داوری کلی": "Overall verdict",
  شبیه‌سازی‌ها: "Simulations",
  "نتایج تحلیل درگیری": "Conflict analysis results",
  "نتایج تحلیل": "Analysis results",
  "تعادل‌های نش یافت شد.": "Nash equilibria found.",
  "پروفایل پایدار وجود ندارد — نزدیک‌ترین به پایدار نمایش داده می‌شود.":
    "No stable profile found. Showing the closest-to-stable profile.",
  گرایش: "Alignment",
  "وزن قدرت": "Power weight",
  دلیل: "Rationale",
  "تعادل نش": "Nash equilibrium",
  "تعادل‌های نش": "Nash equilibria",
  "بهینه پارتو": "Pareto optimal",
  "هم‌گرایی MARL": "MARL convergence",
  "پروفایل پایدار وجود ندارد — نزدیک‌ترین به پایدار ({count} تخلف)":
    "No stable profile — closest to stable ({count} profitable deviations)",
  "طرف {number}": "Party {number}",
  اپیزود: "Episode",
  "بزرگ کردن": "Expand",
  "کوچک کردن": "Shrink",
  "پخش شبیه‌سازی برای {left} و {right}": "Simulation playback for {left} and {right}",
  "امتیاز اولیه": "Initial score",
  نهایی: "Final",
  دور: "Round",
  امتیاز: "Score",
  امتیازها: "points",
  "توقف پخش": "Pause playback",
  "پخش مجدد": "Replay",
  پخش: "Play",
  توقف: "Pause",
  "بازنشانی پخش": "Reset playback",
  بازنشانی: "Reset",
  سرعت: "Speed",
  "سرعت پخش": "Playback speed",
  "مرور دورها": "Scrub rounds",
  آرامش: "Peace",
  "جنگ سرد": "Cold war",
  جنگ: "War",
  تنش: "Tension",
  متهاجم: "Aggressive",
  مشکوک: "Suspicious",
  متقابل: "Reciprocator",
  "همکار محتاط": "Cautious cooperator",
  "متحد وفادار": "Loyal ally",
  "سمت A": "Side A",
  "سمت B": "Side B",
  بی‌طرف: "Neutral",
  "همکاری دوجانبه": "Mutual cooperation",
  مختلط: "Mixed",
  "تخلف دوجانبه": "Mutual defection",
  "همکاری می‌کند": "cooperates",
  "تخلف می‌کند": "defects",
  "بستن پنجره شبیه‌سازی": "Close simulation window",
  "مشاهده نتایج": "View results",
  "در حال آماده‌سازی شبیه‌سازی": "Preparing simulation",
  "نتایج آماده است": "Results ready",
  "نتایج در همین پنجره نمایش داده می‌شود. می‌توانید پنجره را ببندید و بعداً دوباره باز کنید.":
    "Results will appear in this window. You can close it and reopen it later.",
  "بعضی درخواست‌ها ناموفق بود": "Some requests failed",
  آماده: "Ready",
  "باز کردن تنظیمات": "Open settings",
  زبان: "Language",
  "کلید API وجود ندارد — در تنظیمات یک کلید اضافه کنید.": "Missing API key — add one in Settings.",
  "مدلی تنظیم نشده — در تنظیمات یک مدل تعیین کنید.":
    "No model configured — choose one in Settings.",
  "پاسخ سرور قابل خواندن به‌صورت JSON نبود.": "The server response could not be read as JSON.",
  "پاسخ سرور محتوای پیام نداشت.": "The server response contained no message content.",
  "مدل خروجی JSON معتبر نداد — دوباره تلاش کنید یا مدل را عوض کنید.":
    "The model returned invalid JSON — retry or choose another model.",
  "مدل نمره یا توضیح نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.":
    "The model returned an invalid score or rationale — retry or choose another model.",
  "مدل پارامترهای نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.":
    "The model returned invalid parameters — retry or choose another model.",
  "مدل توضیح نامعتبر داد — دوباره تلاش کنید یا مدل را عوض کنید.":
    "The model returned an invalid rationale — retry or choose another model.",
  "نمی‌توان از آدرس پایه «{url}» استفاده کرد — آن را در تنظیمات اصلاح کنید.":
    "Cannot use base URL “{url}” — correct it in Settings.",
  "دسترسی به {url} ممکن نشد — آدرس پایه را در تنظیمات بررسی کنید.":
    "Could not reach {url} — check the base URL in Settings.",
  "خطای API": "API error",
  "درخواست ناموفق": "Request failed",
}

export function translate(
  text: string,
  language: Language,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return (language === "en" ? (EN[text] ?? text) : text).replace(
    /\{(\w+)\}/g,
    (match, key: string) => String(values[key] ?? match),
  )
}
