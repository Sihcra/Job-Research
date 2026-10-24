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

## Design system (Ant Design tokens)

Visual language follows Ant Design (https://github.com/ant-design/ant-design). This is a visual match only: the UI stays plain HTML, CSS, and JS. Do not add React or the antd package.

Tokens to use as CSS custom properties on `:root`:

| Token | Value |
|---|---|
| `--color-primary` | `#1677ff` |
| `--color-success` | `#52c41a` |
| `--color-warning` | `#faad14` |
| `--color-error` | `#ff4d4f` |
| `--color-text` | `rgba(0, 0, 0, 0.88)` |
| `--color-text-secondary` | `rgba(0, 0, 0, 0.65)` |
| `--color-border` | `#d9d9d9` |
| `--color-bg-layout` | `#f5f5f5` |
| `--color-bg-container` | `#ffffff` |
| `--radius` | `6px` |
| `--control-height` | `32px` (inputs and buttons) |
| `--font-size` | `14px` |
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif` |
| `--space-unit` | `4px` (spacing in multiples: 8, 12, 16, 24) |

Components look like Ant Design's:
- **Input, select, textarea**: 1px `--color-border`, `--radius`, height `--control-height`. On focus, border `--color-primary` with a 2px soft ring of the same color at 20% opacity.
- **Primary button**: `--color-primary` background, white text, `--radius`, height `--control-height`. Hover is a slightly lighter primary. Disabled is grey.
- **Default button**: white, 1px `--color-border`, text `--color-text`.
- **Card**: white, 1px `--color-border`, `--radius`, 24px padding, title 16px semi-bold.
- **Alert**: light tinted background, 1px border in the status color, `--radius`. Error uses `--color-error`, success uses `--color-success`.
- **Tag**: 22px height, `--radius`, light primary background for tags.
- **Form label**: 14px, `--color-text`, required mark as a red asterisk.
- **Help text under a field**: 12px, `--color-text-secondary`.
- **Error text under a field**: 14px, `--color-error`.

Use the same tokens on both screens. The CV screen follows this section too.

## Input hints

Every input gets a placeholder and a help line. Free-text fields that have common values also get suggestions through `<datalist>`, so the user can pick or type. Suggestions are only hints; any value is accepted.

| Field | Placeholder | Help text | Suggestions (`<datalist>`) |
|---|---|---|---|
| `full_name` | Ví dụ: Nguyễn Văn A | Đúng như trên giấy tờ tùy thân | none |
| `city` | Ví dụ: Hà Nội | Thành phố bạn đang sống | Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hải Phòng, Cần Thơ, Remote |
| `email` | Ví dụ: ten@email.com | Nhà tuyển dụng sẽ dùng email này để liên hệ | none |
| `phone` | Ví dụ: 0912 345 678 | Không bắt buộc | none |
| `linkedin` | https://www.linkedin.com/in/ten-cua-ban | Dán đường dẫn hồ sơ LinkedIn | none |
| `summary` | Mô tả ngắn về bản thân và thế mạnh chính | 2–4 câu, tối đa 500 ký tự | none |
| `experience.title` | Ví dụ: Data Engineer | Chức danh bạn đã đảm nhận | Software Engineer, Data Engineer, Data Analyst, Product Manager, Marketing Executive, Kế toán |
| `experience.company` | Ví dụ: Công ty ABC | Tên công ty | none |
| `experience.start` | Chọn tháng bắt đầu | Tháng và năm bắt đầu làm việc | none |
| `experience.end` | Để trống nếu đang làm | Bỏ trống nghĩa là hiện tại | none |
| `experience.bullets` | Mỗi dòng một thành tích | Ghi có số liệu nếu được, ví dụ "giảm 20% thời gian xử lý" | none |
| `skills.name` | Ví dụ: Python | Công cụ hoặc kỹ năng cụ thể | Python, JavaScript, TypeScript, Java, SQL, Excel, Power BI, Docker, Git, React, Figma |
| `education.degree` | Ví dụ: Cử nhân Khoa học Máy tính | Bằng cấp cao nhất | Cử nhân, Thạc sĩ, Kỹ sư, Cao đẳng, Chứng chỉ |
| `education.school` | Ví dụ: Đại học Bách khoa Hà Nội | Tên trường | none |
| `education.year` | Ví dụ: 2022 | Năm tốt nghiệp | none |
| `languages.name` | Ví dụ: Tiếng Anh | Ngôn ngữ bạn dùng được | Tiếng Anh, Tiếng Nhật, Tiếng Hàn, Tiếng Trung, Tiếng Pháp |
| `languages.level` | Ví dụ: IELTS 7.0 | Chứng chỉ hoặc mức tự đánh giá | IELTS 6.5, IELTS 7.0, TOEIC 800, Giao tiếp tốt, Đọc hiểu tốt |
| `goals.target_roles` | Ví dụ: Data Engineer, Enter để thêm | Nhấn Enter hoặc dấu phẩy để thêm | Data Engineer, Backend Developer, Business Analyst, Project Manager |
| `goals.locations` | Ví dụ: Hà Nội, Enter để thêm | Nhấn Enter hoặc dấu phẩy để thêm | Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Remote |
| `goals.min_salary_vnd` | Ví dụ: 25000000 | Lương tối thiểu mong muốn, theo tháng, VND | none |
| `goals.avoid` | Ví dụ: Telesales, Enter để thêm | Loại công việc bạn không muốn | Telesales, Bán hàng trực tiếp, Ca đêm, Công tác thường xuyên |

Tag fields and suggestion lists use the same `<datalist>` pattern. Do not invent suggestions beyond this table.
