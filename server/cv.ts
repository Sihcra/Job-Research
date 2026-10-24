// Builds the CV from the saved profile, compiles it with lualatex, and asks Claude for a review.
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

export class CvError extends Error {}

export const DATA = join(import.meta.dir, "..", "data");
export const TEX = join(DATA, "cv.tex");
export const PDF = join(DATA, "cv.pdf");

const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#",
  "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
};

// One pass, so a replacement's own braces are never escaped again.
export function escapeLatex(s: unknown): string {
  return String(s ?? "").replace(/[\\&%$#_{}~^]/g, (c) => SPECIAL[c]);
}

const items = (xs: string[]) =>
  xs.length ? `\\begin{itemize}\n${xs.map((x) => `  \\item ${escapeLatex(x)}`).join("\n")}\n\\end{itemize}` : "";

export function buildTex(p: any): string {
  const per = p.personal ?? {};
  const contact = [per.city, per.email, per.phone, per.linkedin].filter(Boolean).map(escapeLatex).join(" \\textbullet{} ");
  const parts = [
    "\\documentclass[11pt]{article}",
    "\\usepackage{fontspec}",
    "\\usepackage[a4paper,margin=2cm]{geometry}",
    "\\setmainfont{Arial}",
    "\\pagestyle{empty}",
    "\\begin{document}",
    `{\\LARGE\\bfseries ${escapeLatex(per.full_name)}}\\\\`,
    contact,
    per.summary ? `\\par\\medskip ${escapeLatex(per.summary)}` : "",
  ];
  if (p.experience?.length) {
    parts.push("\\section*{Kinh nghiệm}");
    for (const x of p.experience) {
      parts.push(`\\textbf{${escapeLatex(x.title)}} -- ${escapeLatex(x.company)} \\hfill ${x.start} -- ${x.end ?? "hiện tại"}`, items(x.bullets ?? []));
    }
  }
  if (p.skills?.length) parts.push("\\section*{Kỹ năng}", p.skills.map((s: any) => `${escapeLatex(s.name)} (${s.level})`).join(", ") + "\\par");
  if (p.education?.length) {
    parts.push("\\section*{Học vấn}");
    for (const x of p.education) parts.push(`${escapeLatex(x.degree)}, ${escapeLatex(x.school)} (${x.year})\\par`);
  }
  if (p.languages?.length) parts.push("\\section*{Ngoại ngữ}", p.languages.map((l: any) => `${escapeLatex(l.name)}: ${escapeLatex(l.level)}`).join(", ") + "\\par");
  parts.push("\\end{document}");
  return parts.filter(Boolean).join("\n") + "\n";
}

export async function compileCv(p: any): Promise<void> {
  await mkdir(DATA, { recursive: true });
  await Bun.write(TEX, buildTex(p));
  const proc = Bun.spawn(["lualatex", "-interaction=nonstopmode", "-halt-on-error", "-output-directory", DATA, TEX], {
    stdout: "ignore", stderr: "ignore", timeout: 120_000,
  });
  if ((await proc.exited) !== 0) throw new CvError("lualatex failed");
}

const SECTION_NAMES = ["Tóm tắt", "Kinh nghiệm", "Kỹ năng", "Học vấn", "Ngoại ngữ"];
const score = (v: unknown) => typeof v === "number" && v >= 0 && v <= 100;

// Claude may wrap the JSON in prose, so take the outermost braces and check every field.
export function parseReview(raw: string) {
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new CvError("review: no JSON in reply");
  const r = JSON.parse(raw.slice(start, end + 1));
  if (!score(r.overall)) throw new CvError("review: bad overall");
  if (!Array.isArray(r.sections) || r.sections.length !== 5 || !r.sections.every((s: any) => SECTION_NAMES.includes(s?.name) && score(s?.score)))
    throw new CvError("review: bad sections");
  if (!Array.isArray(r.fixes) || r.fixes.length > 5 || !r.fixes.every((f: any) => typeof f?.section === "string" && typeof f?.text === "string" && (f.line === null || typeof f.line === "string")))
    throw new CvError("review: bad fixes");
  return {
    overall: Math.round(r.overall),
    sections: r.sections.map((s: any) => ({ name: s.name, score: Math.round(s.score) })),
    fixes: r.fixes.map((f: any) => ({ section: f.section, line: f.line ?? null, text: f.text })),
  };
}

const PROMPT = `Bạn đánh giá CV tiếng Việt. Chỉ nhận xét dựa trên nội dung có trong CV (LaTeX dưới đây). Không bịa thêm thông tin.
Chỉ trả về một đối tượng JSON, không có chữ nào khác, theo mẫu:
{"overall": <0-100>, "sections": [{"name": "Tóm tắt", "score": <0-100>}, {"name": "Kinh nghiệm", "score": <0-100>}, {"name": "Kỹ năng", "score": <0-100>}, {"name": "Học vấn", "score": <0-100>}, {"name": "Ngoại ngữ", "score": <0-100>}], "fixes": [{"section": "<tên mục>", "line": "<dòng liên quan hoặc null>", "text": "<việc cần sửa, ngắn gọn>"}]}
Tối đa 5 việc cần sửa.`;

export async function reviewCv(texSource: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new CvError("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1500, messages: [{ role: "user", content: `${PROMPT}\n\n${texSource}` }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new CvError(`Claude API returned ${res.status}`);
  const body: any = await res.json();
  return parseReview((body.content ?? []).map((c: any) => c.text ?? "").join(""));
}
