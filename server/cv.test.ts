import { expect, test } from "bun:test";
import { escapeLatex, parseReview } from "./cv";

test("escapeLatex escapes special characters once and leaves Vietnamese text alone", () => {
  expect(escapeLatex("A & B 50% $x_1$ {}")).toBe("A \\& B 50\\% \\$x\\_1\\$ \\{\\}");
  expect(escapeLatex("Nguyễn Văn A")).toBe("Nguyễn Văn A");
});

const valid = {
  overall: 72,
  sections: ["Tóm tắt", "Kinh nghiệm", "Kỹ năng", "Học vấn", "Ngoại ngữ"].map((name) => ({ name, score: 70 })),
  fixes: [{ section: "Tóm tắt", line: null, text: "Thêm số liệu." }],
};

test("parseReview accepts JSON wrapped in prose", () => {
  expect(parseReview(`Đây là kết quả: ${JSON.stringify(valid)} Hết.`).overall).toBe(72);
});

test("parseReview rejects a score out of range and a missing section", () => {
  expect(() => parseReview(JSON.stringify({ ...valid, overall: 150 }))).toThrow();
  expect(() => parseReview(JSON.stringify({ ...valid, sections: valid.sections.slice(1) }))).toThrow();
});
