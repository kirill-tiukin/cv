import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PdfData {
  Pages: Array<{
    Texts: Array<{ R: Array<{ T: string }> }>;
  }>;
}

interface PreParsed {
  educationGrades: Array<{ institutionHint: string; grade: string }>;
  skillSections:   Array<{ label: string; items: string[] }>;
  phone:           string;
  linkedin:        string;
}

interface EducationEntry {
  institution?: string;
  degree?:      string;
  grade?:       string;
  bullets?:     unknown[];
  [key: string]: unknown;
}

interface ParsedResume {
  education?: EducationEntry[];
  personal?:  { linkedin?: string; phone?: string; [key: string]: unknown };
  skills?:    Array<{ id: string; label: string; items: string[] }>;
  [key: string]: unknown;
}

// ── Provider config ───────────────────────────────────────────────────────────
interface Provider {
  name:       string;
  url:        string;
  apiKeyEnv:  string;
  model:      string;
  extraHeaders?: Record<string, string>;
}

const PROVIDERS: Provider[] = [
  {
    // ~14,400 req/day free — primary workhorse
    name:      "groq-fast",
    url:       "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnv: "GROQ_API_KEY",
    model:     "llama-3.1-8b-instant",
  },
  {
    // ~1,000 req/day free — higher quality fallback on the same key
    name:      "groq-quality",
    url:       "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnv: "GROQ_API_KEY",
    model:     "llama3-70b-8192",
  },
  {
    // 50 req/day free (no credit), 1 000/day with $10 top-up
    name:      "openrouter",
    url:       "https://openrouter.ai/api/v1/chat/completions",
    apiKeyEnv: "OPENROUTER_API_KEY",
    model:     "meta-llama/llama-3.1-8b-instruct:free",
    extraHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title":      "CV Parser",
    },
  },
  {
    // Original HF model — last resort only
    name:      "huggingface",
    url:       "https://router.huggingface.co/v1/chat/completions",
    apiKeyEnv: "HF_API_KEY",
    model:     "Qwen/Qwen3-32B",
  },
];

const MAX_RESUME_CHARS = 12_000;
const MAX_TOKENS       = 4_096;

// ═════════════════════════════════════════════════════════════════════════════
// PRE-PARSER — runs entirely in code before any AI call
// ═════════════════════════════════════════════════════════════════════════════

function splitSections(text: string): Record<string, string> {
  const HEADER_RE = /^[\s\uf0b7•\-]*\n?(EDUCATION|ACADEMIC|QUALIFICATIONS?|WORK[\s&]+(?:LEADERSHIP\s+)?EXPERIENCE|EXPERIENCE|EMPLOYMENT|SKILLS?(?:[\s,&]+(?:ACTIVITIES|INTERESTS|LANGUAGES))*|EXTRACURRICULAR|PROJECTS?|INTERESTS?|CERTIFICATIONS?|ACTIVITIES|LANGUAGES?|PERSONAL)\b/gim;

  const sections: Record<string, string> = {};
  const matches: Array<{ name: string; index: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = HEADER_RE.exec(text)) !== null) {
    matches.push({ name: m[1].toUpperCase().trim(), index: m.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end   = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[matches[i].name] = text.slice(start, end);
  }

  return sections;
}

function extractEducationGrades(eduText: string): Array<{ institutionHint: string; grade: string }> {
  const results: Array<{ institutionHint: string; grade: string }> = [];

  const GRADE_LINE_RE = /(?:^|[\n•\uf0b7])\s*Grade\s*[:\-–]\s*([^\n•\uf0b7]{2,80})/gim;
  let match: RegExpExecArray | null;

  while ((match = GRADE_LINE_RE.exec(eduText)) !== null) {
    const gradeRaw = match[1].trim().replace(/\.$/, "").replace(/\s+/g, " ");
    if (!gradeRaw) continue;

    const before          = eduText.slice(0, match.index);
    const lines           = before.split("\n").filter(l => l.trim().length > 2);
    const institutionHint = lines.slice(-6).reverse().find(l =>
      /university|college|school|institute|foundation|academy/i.test(l) || l.trim().length > 10
    ) ?? lines[lines.length - 1] ?? "";

    results.push({ institutionHint: institutionHint.trim().slice(0, 80), grade: gradeRaw });
  }

  const CLASSIFICATION_RE = /(?:^|[\n•\uf0b7])\s*((?:Predicted\s+)?(?:First[\s-]?Class(?:\s+Honours)?|1st\s+Class|Upper\s+Second|2[.:][12]|Lower\s+Second|2[.:][23]|Third\s+Class|3rd\s+Class|Distinction\*?|Triple\s+Distinction|Double\s+Distinction|Merit|GPA\s*[:\-]?\s*\d+[.,]\d+|\d{2,3}(?:[.,]\d+)?\s*%))/gim;

  while ((match = CLASSIFICATION_RE.exec(eduText)) !== null) {
    const gradeRaw = match[1].trim().replace(/\.$/, "").replace(/\s+/g, " ");
    if (!gradeRaw) continue;

    const alreadyCaptured = results.some(r =>
      r.grade.toLowerCase().includes(gradeRaw.toLowerCase()) ||
      gradeRaw.toLowerCase().includes(r.grade.toLowerCase())
    );
    if (alreadyCaptured) continue;

    const before          = eduText.slice(0, match.index);
    const lines           = before.split("\n").filter(l => l.trim().length > 2);
    const institutionHint = lines.slice(-6).reverse().find(l =>
      /university|college|school|institute|foundation|academy/i.test(l) || l.trim().length > 10
    ) ?? lines[lines.length - 1] ?? "";

    results.push({ institutionHint: institutionHint.trim().slice(0, 80), grade: gradeRaw });
  }

  return results;
}

function extractSkillSections(skillsText: string): Array<{ label: string; items: string[] }> {
  const results: Array<{ label: string; items: string[] }> = [];
  const LABEL_RE = /(?:^|\n)\s*([A-Z][A-Za-z\s&,]{2,40}?)\s*[:\-–]\s*([^\n]{2,})/gm;

  let match: RegExpExecArray | null;
  while ((match = LABEL_RE.exec(skillsText)) !== null) {
    const label    = match[1].trim();
    const rawItems = match[2].trim();

    if (/^\d|^https?:|^www\.|^[+\(]/.test(label)) continue;
    if (label.split(" ").length > 5) continue;

    const items = rawItems
      .split(/[;,]/)
      .map(s => s.trim().replace(/\.$/, "").replace(/\s+/g, " "))
      .filter(s => s.length > 0);

    if (items.length > 0) results.push({ label, items });
  }

  return results;
}

function extractAndNormalisePhone(text: string): string {
  const PHONE_RE = /(?:\+44|0)[\s\-]?(?:\d[\s\-]?){9,10}/g;
  const match    = PHONE_RE.exec(text);
  if (!match) return "";
  return normaliseUKPhone(match[0]);
}

function normaliseUKPhone(phone: string): string {
  if (!phone) return phone;
  const s = phone.replace(/[^\d+]/g, "");
  if (s.startsWith("+44") && s.length === 13) return `+44 ${s.slice(3, 7)} ${s.slice(7)}`;
  if (s.startsWith("0")   && s.length === 11) return `+44 ${s.slice(1, 5)} ${s.slice(5)}`;
  return phone;
}

function extractAndNormaliseLinkedIn(text: string): string {
  const match = text.match(/linkedin(?:\.com)?\/in\/([A-Za-z0-9_-]+)/i);
  if (match) return `https://linkedin.com/in/${match[1]}`;
  return "";
}

function normaliseLinkedIn(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  const match = raw.match(/linkedin(?:\.com)?\/in\/([A-Za-z0-9_-]+)/i);
  if (match) return `https://linkedin.com/in/${match[1]}`;
  return raw.trim();
}

function preParse(text: string): PreParsed {
  const sections = splitSections(text);
  const eduText  = sections["EDUCATION"] ?? sections["ACADEMIC"] ?? sections["QUALIFICATIONS"] ?? "";
  const skillsText = Object.entries(sections)
    .filter(([k]) => /SKILL|INTEREST|ACTIVIT|CERTIF|LANGUAGE/.test(k))
    .map(([, v]) => v)
    .join("\n") || text;

  return {
    educationGrades: extractEducationGrades(eduText || text),
    skillSections:   extractSkillSections(skillsText),
    phone:           extractAndNormalisePhone(text),
    linkedin:        extractAndNormaliseLinkedIn(text),
  };
}

function buildPreParsedBlock(pp: PreParsed): string {
  const lines: string[] = [];
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║  PRE-PARSED DATA — USE THESE EXACT VALUES, DO NOT IGNORE    ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");

  if (pp.educationGrades.length > 0) {
    lines.push("GRADES (match to education entries by institution name):");
    for (const g of pp.educationGrades) {
      lines.push(`  • Institution hint: "${g.institutionHint}"`);
      lines.push(`    ➜ grade field MUST be: "${g.grade}"`);
    }
    lines.push("");
  }

  if (pp.skillSections.length > 0) {
    lines.push("SKILLS (use these exact labels and items — include ALL of them):");
    for (const s of pp.skillSections) {
      lines.push(`  • label: "${s.label}" → items: [${s.items.map(i => `"${i}"`).join(", ")}]`);
    }
    lines.push("");
  }

  if (pp.phone)    lines.push(`PHONE (use exactly): "${pp.phone}"`);
  if (pp.linkedin) lines.push(`LINKEDIN (use exactly): "${pp.linkedin}"`);
  lines.push("══════════════════════════════════════════════════════════════");

  return "\n\n" + lines.join("\n") + "\n\n";
}

// ═════════════════════════════════════════════════════════════════════════════
// POST-PROCESSING
// ═════════════════════════════════════════════════════════════════════════════

function injectGradeBullet(entry: EducationEntry): EducationEntry {
  const grade = (entry.grade ?? "").trim();
  if (!grade) return entry;

  const gradeBullet    = `Grade: ${grade}`;
  const bullets        = Array.isArray(entry.bullets) ? (entry.bullets as string[]) : [];
  const alreadyPresent = bullets.some(
    b => typeof b === "string" && b.toLowerCase().startsWith("grade:")
  );

  if (alreadyPresent) return entry;
  return { ...entry, bullets: [gradeBullet, ...bullets] };
}

function patchOutput(parsed: ParsedResume, pp: PreParsed): ParsedResume {
  if (pp.phone && parsed.personal) {
    if (!parsed.personal.phone || parsed.personal.phone.trim() === "") {
      parsed.personal.phone = pp.phone;
    } else {
      parsed.personal.phone = normaliseUKPhone(parsed.personal.phone);
    }
  }

  if (parsed.personal) {
    if (pp.linkedin && (!parsed.personal.linkedin || parsed.personal.linkedin.trim() === "")) {
      parsed.personal.linkedin = pp.linkedin;
    } else if (parsed.personal.linkedin) {
      parsed.personal.linkedin = normaliseLinkedIn(parsed.personal.linkedin);
    }
  }

  if (parsed.education) {
    parsed.education = parsed.education.map(entry => {
      if (!entry.grade || entry.grade.trim() === "") {
        const inst = (entry.institution ?? "").toLowerCase();
        const hint = pp.educationGrades.find(g => {
          const hintText  = g.institutionHint.toLowerCase();
          const instWords = inst.split(/\s+/).filter(w => w.length > 3);
          return instWords.some(w => hintText.includes(w));
        });

        if (hint) {
          console.log(`[parse-resume] Grade patched: "${entry.institution}" → "${hint.grade}"`);
          entry = { ...entry, grade: hint.grade };
        } else if (parsed.education!.length === 1 && pp.educationGrades.length > 0) {
          entry = { ...entry, grade: pp.educationGrades[0].grade };
        }
      }
      return injectGradeBullet(entry);
    });
  }

  if (pp.skillSections.length > 0) {
    const existingLabels = new Set((parsed.skills ?? []).map(s => s.label.toLowerCase()));
    const missing = pp.skillSections.filter(s => !existingLabels.has(s.label.toLowerCase()));
    if (missing.length > 0) {
      const existingCount = (parsed.skills ?? []).length;
      const newEntries    = missing.map((s, i) => ({
        id:    `s${existingCount + i + 1}`,
        label: s.label,
        items: s.items,
      }));
      parsed.skills = [...(parsed.skills ?? []), ...newEntries];
      console.log(`[parse-resume] Patched ${missing.length} missing skill sections:`, missing.map(s => s.label));
    }
  }

  return parsed;
}

// ═════════════════════════════════════════════════════════════════════════════
// NORMALISERS
// ═════════════════════════════════════════════════════════════════════════════

const MONTH_MAP: Record<string, string> = {
  january:"Jan", february:"Feb", march:"Mar", april:"Apr",
  may:"May", june:"Jun", july:"Jul", august:"Aug",
  september:"Sep", october:"Oct", november:"Nov", december:"Dec",
};

function shortenMonths(v: string): string {
  return v.replace(
    /\b(January|February|March|April|June|July|August|September|October|November|December)\b/gi,
    m => MONTH_MAP[m.toLowerCase()] ?? m
  );
}

function normalise(obj: unknown): unknown {
  if (typeof obj === "string") return shortenMonths(obj);
  if (Array.isArray(obj))      return obj.map(normalise);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
        if (k === "phone"    && typeof v === "string") return [k, normaliseUKPhone(v)];
        if (k === "linkedin" && typeof v === "string") return [k, normaliseLinkedIn(v)];
        return [k, normalise(v)];
      })
    );
  }
  return obj;
}

// ═════════════════════════════════════════════════════════════════════════════
// PDF EXTRACTOR
// ═════════════════════════════════════════════════════════════════════════════

function safeDecodeURI(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (err: Error | { parserError: Error }) => {
      reject(new Error(err instanceof Error ? err.message : String(err.parserError)));
    });
    parser.on("pdfParser_dataReady", (data: unknown) => {
      try {
        const pdf  = data as PdfData;
        const text = pdf.Pages
          .flatMap(p => p.Texts.flatMap(t => t.R.map(r => safeDecodeURI(r.T))))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        resolve(text);
      } catch (e) { reject(e); }
    });
    parser.parseBuffer(buffer);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an expert UK CV parser. Return ONLY a raw JSON object — no markdown, no explanation, no thinking tags.

OUTPUT SHAPE:
{
  "personal": { "name":"","email":"","phone":"","location":"","website":"","linkedin":"","github":"","summary":"" },
  "education": [{ "id":"e1","institution":"","degree":"","field":"","startDate":"","endDate":"","grade":"","location":"","bullets":[] }],
  "experience": [{ "id":"exp1","company":"","role":"","startDate":"","endDate":"","location":"","bullets":[] }],
  "projects":   [{ "id":"p1","name":"","role":"","startDate":"","endDate":"","bullets":[] }],
  "skills":     [{ "id":"s1","label":"","items":[] }]
}

RULES:
- The user message contains a PRE-PARSED DATA block — those values are authoritative. Use them exactly.
- "grade" field: use the exact value from PRE-PARSED DATA. Never leave it empty if a value exists there.
- "skills": include every section from PRE-PARSED DATA — Languages, Technical Skills, Soft Skills, Certifications & Training, Activities, Interests — each as its own skill entry with its own id.
- "phone": use the exact pre-parsed value.
- "linkedin": use the exact pre-parsed value.
- DATES: shorten months to 3 letters. "September 2021" → "Sep 2021". "Present"/"Current" → "Present".
- BULLETS: concise, action-oriented, past-tense verb. Field name is "bullets" never "achievements".
- IDs: e1/e2, exp1/exp2, p1/p2, s1/s2 etc.
- British English. Extract ALL jobs, ALL education, ALL projects — never skip any.`;

// ═════════════════════════════════════════════════════════════════════════════
// MULTI-PROVIDER FAILOVER
// ═════════════════════════════════════════════════════════════════════════════

async function callWithFailover(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      errors.push(`${provider.name}: env var ${provider.apiKeyEnv} not set — skipping`);
      continue;
    }

    try {
      console.log(`[parse-resume] Trying provider: ${provider.name} (${provider.model})`);

      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...provider.extraHeaders,
        },
        body: JSON.stringify({
          model:           provider.model,
          temperature:     0.05,
          max_tokens:      MAX_TOKENS,
          response_format: { type: "json_object" },
          messages,
        }),
      });

      // 429 = rate-limited, 5xx = server error → try next provider
      if (res.status === 429 || res.status >= 500) {
        const body = await res.json().catch(() => ({}));
        errors.push(`${provider.name} [${res.status}]: ${JSON.stringify(body)}`);
        console.warn(`[parse-resume] ${provider.name} unavailable (${res.status}), trying next provider…`);
        continue;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        errors.push(`${provider.name} [${res.status}]: ${JSON.stringify(body)}`);
        console.warn(`[parse-resume] ${provider.name} error (${res.status}), trying next provider…`);
        continue;
      }

      const data    = await res.json();
      const content = data?.choices?.[0]?.message?.content as string | undefined;

      if (!content) {
        errors.push(`${provider.name}: empty content in response`);
        continue;
      }

      console.log(`[parse-resume] ✓ Success via ${provider.name}`);
      return content;

    } catch (e) {
      errors.push(`${provider.name}: ${(e as Error).message}`);
      console.warn(`[parse-resume] ${provider.name} threw an exception, trying next…`, e);
    }
  }

  throw new Error(`All providers exhausted:\n${errors.join("\n")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { base64, mediaType } = await request.json();
    if (!base64 || !mediaType) {
      return NextResponse.json({ error: "Missing base64 or mediaType" }, { status: 400 });
    }

    // Ensure at least one provider key exists before doing any heavy work
    const hasAnyKey = PROVIDERS.some(p => !!process.env[p.apiKeyEnv]);
    if (!hasAnyKey) {
      return NextResponse.json(
        { error: "No AI provider API keys configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or HF_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    // 1. Extract raw text
    const buffer     = Buffer.from(base64, "base64");
    const resumeText = mediaType === "application/pdf"
      ? await extractTextFromPdf(buffer)
      : (await mammoth.extractRawText({ buffer })).value;

    console.log("[parse-resume] Extracted chars:", resumeText.length);

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text — try a DOCX or a text-based PDF (not scanned)" },
        { status: 422 }
      );
    }

    // 2. Pre-parse
    const preParsed = preParse(resumeText);
    console.log("[parse-resume] Pre-parsed:", JSON.stringify(preParsed, null, 2));

    // 3. Build prompt
    const preParsedBlock = buildPreParsedBlock(preParsed);
    const userMessage    = `Parse this CV.${preParsedBlock}CV TEXT:\n${resumeText.slice(0, MAX_RESUME_CHARS)}`;

    // 4. Call providers with automatic failover
    let rawText: string;
    try {
      rawText = await callWithFailover([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ]);
    } catch (e) {
      console.error("[parse-resume] All providers failed:", e);
      return NextResponse.json(
        { error: "All AI providers are currently unavailable — please try again later" },
        { status: 503 }
      );
    }

    // 5. Parse → patch → normalise
    const parsed  = JSON.parse(rawText) as ParsedResume;
    const patched = patchOutput(parsed, preParsed);
    const final   = normalise(patched);

    return NextResponse.json({ data: final });

  } catch (e: unknown) {
    console.error("[parse-resume] Error:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}