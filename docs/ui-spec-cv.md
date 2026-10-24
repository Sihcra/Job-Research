# UI Spec: CV Screen

Source of truth for the CV screen. Antigravity builds the UI from this file. Claude builds the server routes and logic from the same file. It extends the Profile screen in [ui-spec.md](ui-spec.md) and uses the same layout, tokens, and states.

## Scope

One screen: **CV**. The user generates a CV from the saved profile, previews the PDF, downloads it, and asks for a review. The review shows a score per section and concrete fixes.

Out of scope: editing the CV text directly, multiple CV versions, cover letters, and the Jobs screen.

## Layout

- Same shell as the Profile screen: single column, max width 720px, 16px gutter on phones, no horizontal scroll.
- Page title: "CV của tôi".
- Three blocks in order:
  1. **Tạo CV** (generate): a primary button "Tạo CV từ hồ sơ" and a status line.
  2. **Xem trước** (preview): an embedded PDF viewer, 640px tall on desktop, 480px on phones. Below it a secondary button "Tải PDF".
  3. **Đánh giá** (review): a button "Đánh giá CV", then the review result.
- The profile is read-only here. A link "Sửa hồ sơ" goes to the Profile screen.

## Actions

| Action | Button | Request | Success | Failure |
|---|---|---|---|---|
| Generate | "Tạo CV từ hồ sơ" | POST `/api/cv/generate` | Status "Đã tạo CV lúc HH:MM", preview refreshes | Error banner "Không tạo được CV. Thử lại." |
| Preview | (automatic after generate) | GET `/api/cv/pdf` | PDF shows in the viewer | Viewer shows "Chưa có CV. Bấm Tạo CV." |
| Download | "Tải PDF" | GET `/api/cv/pdf` | Browser downloads `cv.pdf` | Error toast |
| Review | "Đánh giá CV" | POST `/api/cv/review` | Review block fills in | Error banner "Không đánh giá được CV. Thử lại." |

Generate and review can take up to 60 seconds. Both buttons show a progress line while running and are disabled until the call ends.

## Review block

- Overall score, 0–100, in one large number, with a label: "Cần cải thiện" (0–59), "Khá" (60–79), "Tốt" (80–100).
- One row per section: Tóm tắt, Kinh nghiệm, Kỹ năng, Học vấn, Ngoại ngữ. Each row shows the section name, its score, and a bar.
- Under the rows, a list "Cần sửa" with up to 5 items. Each item has a short fix and, if given, the line it refers to.
- If there are no fixes, show "Không có điểm cần sửa."

## States

- **Empty** (no CV yet): preview shows "Chưa có CV. Bấm Tạo CV." Review button disabled with a hint "Tạo CV trước để đánh giá."
- **Generating**: button text "Đang tạo…", disabled. Preview keeps the old PDF if one exists.
- **Ready**: status line shows the time of generation. Preview and download enabled.
- **Reviewing**: button text "Đang đánh giá…", disabled. Old review stays visible until the new one arrives.
- **Error, generate failed**: banner "Không tạo được CV. Thử lại." with a retry button.
- **Error, review failed**: banner "Không đánh giá được CV. Thử lại." with a retry button.
- **Error, PDF missing**: same as Empty.

## Data contract

Base URL: `http://localhost:8000` (same as the Profile screen).

### POST `/api/cv/generate`
- Body: none.
- 200: `{ "ok": true, "generated_at": "<ISO timestamp>" }`
- 409: `{ "ok": false, "error": "profile_missing" }`. UI tells the user to fill in the profile first, with a link.
- 500: `{ "ok": false, "error": "generate_failed" }`.

### GET `/api/cv/pdf`
- 200: `application/pdf` body.
- 404: no CV yet. UI shows the Empty state.

### POST `/api/cv/review`
- Body: none.
- 200: the review JSON below.
- 409: `{ "ok": false, "error": "no_cv" }`. UI shows the Empty hint.
- 500: `{ "ok": false, "error": "review_failed" }`.

Antigravity works against the sample JSON below only. It makes no network calls in the pilot. Claude replaces the mock with real calls after review. The PDF preview uses a placeholder PDF in the mock.

## Sample review JSON (mock data)

```json
{
  "ok": true,
  "overall": 72,
  "sections": [
    { "name": "Tóm tắt", "score": 65 },
    { "name": "Kinh nghiệm", "score": 80 },
    { "name": "Kỹ năng", "score": 70 },
    { "name": "Học vấn", "score": 90 },
    { "name": "Ngoại ngữ", "score": 60 }
  ],
  "fixes": [
    { "section": "Tóm tắt", "line": null, "text": "Thêm một kết quả có số liệu vào phần mở đầu." },
    { "section": "Kinh nghiệm", "line": "Xây dựng pipeline ETL", "text": "Ghi rõ công nghệ đã dùng." },
    { "section": "Ngoại ngữ", "line": "Tiếng Anh", "text": "Ghi điểm IELTS theo đúng mẫu chứng chỉ." }
  ]
}
```

## Acceptance checks (for Claude's review)

- Three blocks in the order above, with the actions in the table.
- Score and bar for each of the five sections; overall score label matches the range.
- Fix list shows up to 5 items, with the "Không có điểm cần sửa." case.
- All states render: Empty, Generating, Ready, Reviewing, and each error.
- Generate and review buttons are disabled while their call runs.
- PDF viewer fits a 375px screen with no horizontal scroll.
- Vietnamese labels, no emoji.
- Only files under `ui/` were created or changed.
- No network calls with the mock on (`USE_MOCK` stays `true`).
