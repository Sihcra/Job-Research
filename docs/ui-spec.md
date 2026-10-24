# UI Spec: Profile Screen (pilot)

Source of truth for the Profile screen. Antigravity builds the UI from this file. Claude builds the server routes and logic from the same file.

## Scope

One screen: **Profile**. A single form that stores the user's identity, experience, skills, education, languages, and goals. Runs on localhost. One user, no login.

Out of scope for this pilot: CV tab, Jobs tab, scoring, file upload, multi-user.

## Layout

- Single column, max width 720px, centered. 16px side gutter on phones, no horizontal scroll.
- Page title: "Hồ sơ của tôi" (My profile).
- Sections in order, each with a heading: Thông tin cá nhân, Kinh nghiệm, Kỹ năng, Học vấn, Ngoại ngữ, Mục tiêu.
- Lists (Kinh nghiệm, Kỹ năng, Học vấn, Ngoại ngữ) have an "Thêm" button to add a row and a remove button on each row.
- Sticky footer with one primary button: "Lưu hồ sơ" (Save profile).
- Language: Vietnamese labels. Field names in the JSON stay English.

## Fields

### Thông tin cá nhân (personal)
| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | text | yes | |
| `city` | text | yes | |
| `email` | email | yes | Validate format. |
| `phone` | tel | no | |
| `linkedin` | url | no | Validate as URL if filled. |
| `summary` | textarea | no | 2–4 sentences, max 500 chars. Counter shown. |

### Kinh nghiệm (experience), list
| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | text | yes | Job title. |
| `company` | text | yes | |
| `start` | month | yes | `YYYY-MM` |
| `end` | month | no | Empty means "hiện tại" (current). Must be after `start`. |
| `bullets` | textarea list | no | One achievement per line. Store as array. |

### Kỹ năng (skills), list
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | e.g. "Python", "SQL". |
| `level` | select | yes | `beginner`, `working`, `advanced`, `expert`. |

### Học vấn (education), list
| Field | Type | Required | Notes |
|---|---|---|---|
| `degree` | text | yes | |
| `school` | text | yes | |
| `year` | number | yes | 4 digits, 1950–2035. |

### Ngoại ngữ (languages), list
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | e.g. "Tiếng Anh". |
| `level` | text | yes | Free text, e.g. "IELTS 7.0", "Giao tiếp tốt". |

### Mục tiêu (goals)
| Field | Type | Required | Notes |
|---|---|---|---|
| `target_roles` | tags | no | Comma or Enter to add. |
| `locations` | tags | no | |
| `min_salary_vnd` | number | no | Monthly, in VND. |
| `avoid` | tags | no | Job types the user does not want. |

## States

- **Loading**: skeleton on the form while the profile loads. Save button disabled.
- **Empty** (no profile yet): form renders with empty fields, and a one-line hint: "Điền thông tin để bắt đầu."
- **Saving**: button shows "Đang lưu…" and is disabled.
- **Saved**: a non-blocking toast "Đã lưu hồ sơ" for 3 seconds.
- **Error, load failed**: message "Không tải được hồ sơ. Thử lại." with a retry button.
- **Error, save failed**: message "Không lưu được. Dữ liệu vẫn còn trên màn hình." Keep the typed data.
- **Validation error**: inline message under the field. Focus the first invalid field on save.

## Data contract

Base URL: `http://localhost:8000` (Claude sets this on the server).

### GET `/api/profile`
- 200: the profile JSON below.
- 404: no profile yet. UI shows the Empty state.
- 500: UI shows the load-failed error.

### PUT `/api/profile`
- Body: the full profile JSON below.
- 200: `{ "ok": true, "saved_at": "<ISO timestamp>" }`
- 400: `{ "ok": false, "errors": { "<field path>": "<message>" } }`. UI maps each path to its field.
- 500: UI shows the save-failed error.

Antigravity works against the sample JSON below only. It makes no network calls in the pilot. Claude replaces the mock with real calls after review.

## Sample JSON (mock data)

```json
{
  "personal": {
    "full_name": "Nguyễn Văn A",
    "city": "Hà Nội",
    "email": "a@example.com",
    "phone": "",
    "linkedin": "",
    "summary": "Kỹ sư dữ liệu với 3 năm kinh nghiệm xây dựng pipeline."
  },
  "experience": [
    {
      "title": "Data Engineer",
      "company": "Công ty mẫu",
      "start": "2023-03",
      "end": null,
      "bullets": ["Xây dựng pipeline ETL xử lý 2 triệu bản ghi mỗi ngày."]
    }
  ],
  "skills": [
    { "name": "Python", "level": "advanced" },
    { "name": "SQL", "level": "working" }
  ],
  "education": [
    { "degree": "Cử nhân Khoa học Máy tính", "school": "Trường mẫu", "year": 2022 }
  ],
  "languages": [
    { "name": "Tiếng Anh", "level": "IELTS 7.0" }
  ],
  "goals": {
    "target_roles": ["Data Engineer"],
    "locations": ["Hà Nội", "Remote"],
    "min_salary_vnd": 25000000,
    "avoid": ["Telesales"]
  }
}
```

## Acceptance checks (for Claude's review)

- Every field in this spec exists in the UI with the right input type.
- Each list supports add and remove.
- All five states render: empty, loading, saving, saved, error.
- Validation errors appear under the right field.
- Works at 375px width with no horizontal scroll.
- No emoji in the UI.
- Only files under `ui/` were created or changed.
