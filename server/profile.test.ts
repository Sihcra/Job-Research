import { expect, test } from "bun:test";
import { validateProfile } from "./profile";

const good = {
  personal: { full_name: "Nguyễn Văn A", city: "Hà Nội", email: "a@example.com", phone: "", linkedin: "", summary: "" },
  experience: [{ title: "Data Engineer", company: "ABC", start: "2023-03", end: null, bullets: [] }],
  skills: [{ name: "Python", level: "advanced" }],
  education: [{ degree: "Cử nhân", school: "Trường", year: 2022 }],
  languages: [{ name: "Tiếng Anh", level: "IELTS 7.0" }],
  goals: { target_roles: [], locations: [], min_salary_vnd: null, avoid: [] },
};

test("valid profile has no errors", () => {
  expect(validateProfile(good)).toEqual({});
});

test("bad email and end-before-start are reported at their field paths", () => {
  const bad = structuredClone(good);
  bad.personal.email = "not-an-email";
  bad.experience[0].end = "2020-01";
  const e = validateProfile(bad);
  expect(e["personal.email"]).toBeDefined();
  expect(e["experience.0.end"]).toBeDefined();
});

test("year outside 1950-2035 is rejected", () => {
  const bad = structuredClone(good);
  bad.education[0].year = 2100;
  expect(validateProfile(bad)["education.0.year"]).toBeDefined();
});
