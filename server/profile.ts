// Validation for the Profile form. Returns { path: message } keyed the way ui-spec.md names fields.
export type Errors = Record<string, string>;

const LEVELS = ["beginner", "working", "advanced", "expert"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateProfile(p: any): Errors {
  if (!p || typeof p !== "object") return { profile: "Dữ liệu không hợp lệ" };
  const e: Errors = {};
  const per = p.personal ?? {};
  if (!text(per.full_name)) e["personal.full_name"] = "Bắt buộc";
  if (!text(per.city)) e["personal.city"] = "Bắt buộc";
  if (!EMAIL.test(text(per.email))) e["personal.email"] = "Email không đúng định dạng";
  if (text(per.linkedin) && !/^https?:\/\//.test(text(per.linkedin))) e["personal.linkedin"] = "Phải bắt đầu bằng http:// hoặc https://";
  if (text(per.summary).length > 500) e["personal.summary"] = "Tối đa 500 ký tự";

  (p.experience ?? []).forEach((x: any, i: number) => {
    if (!text(x?.title)) e[`experience.${i}.title`] = "Bắt buộc";
    if (!text(x?.company)) e[`experience.${i}.company`] = "Bắt buộc";
    if (!MONTH.test(text(x?.start))) e[`experience.${i}.start`] = "Dạng YYYY-MM";
    if (x?.end && (!MONTH.test(x.end) || x.end <= x.start)) e[`experience.${i}.end`] = "Dạng YYYY-MM và sau ngày bắt đầu";
  });
  (p.skills ?? []).forEach((x: any, i: number) => {
    if (!text(x?.name)) e[`skills.${i}.name`] = "Bắt buộc";
    if (!LEVELS.includes(x?.level)) e[`skills.${i}.level`] = "Chọn mức độ";
  });
  (p.education ?? []).forEach((x: any, i: number) => {
    if (!text(x?.degree)) e[`education.${i}.degree`] = "Bắt buộc";
    if (!text(x?.school)) e[`education.${i}.school`] = "Bắt buộc";
    if (!Number.isInteger(x?.year) || x.year < 1950 || x.year > 2035) e[`education.${i}.year`] = "Năm từ 1950 đến 2035";
  });
  (p.languages ?? []).forEach((x: any, i: number) => {
    if (!text(x?.name)) e[`languages.${i}.name`] = "Bắt buộc";
    if (!text(x?.level)) e[`languages.${i}.level`] = "Bắt buộc";
  });
  const g = p.goals ?? {};
  if (g.min_salary_vnd != null && !(typeof g.min_salary_vnd === "number" && g.min_salary_vnd >= 0)) e["goals.min_salary_vnd"] = "Số không âm";
  return e;
}
