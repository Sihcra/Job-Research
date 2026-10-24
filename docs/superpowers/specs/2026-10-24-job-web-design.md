# Local Job Web App: Design

Date: 2026-10-24
Status: Draft, waiting for approval

## Intent

A local web app for one person (or a small group) that:

1. Takes the user's skills and experience through a form.
2. Generates a CV from that data.
3. Evaluates the CV against a rubric.
4. Finds Vietnamese and Danish job postings that fit the CV.
5. Scores each job, and assesses the company behind it.

The user submits applications themselves. The app never submits on their behalf and never bypasses captcha or bot checks.

## Goals

- One form, one profile. Everything else reads from it.
- CV output as a 2-page PDF (lualatex), based on the existing moderncv template.
- A CV score with concrete fixes, not a vague grade.
- A ranked job list with a fit score and a short reason per job.
- Company assessment from public sources, with the source shown for each claim.

## Non-goals

- Auto-submitting applications.
- Solving captcha, login walls, or bot blocks.
- Multi-user accounts or auth. Runs on localhost only.
- Scraping portals that robots.txt disallows.

## Constraints

- Local machine, Windows. Installed: bun 1.4.4, lualatex and xelatex (MiKTeX 25.12), python.
- Scoring and CV generation use the Claude API with an API key from an environment variable (`ANTHROPIC_API_KEY`). The key is never typed into the chat or written into a file.
- Model choice: `claude-haiku-5-5` for bulk job scoring (cheap), `claude-sonnet-5-5` for CV generation and CV review (quality matters).
- The existing portal CLIs in `.agents/skills/` (bun, no AI calls) are reused as the search layer.
- Vietnamese portals have no CLI yet. Robots.txt status: ITviec and Topdev allow general pages; Vieclam24h blocks keyword search URLs; TopCV, VietnamWorks, and CareerBuilder are not fully verified.

## Approaches considered

1. **Web app shells out to the repo's Claude Code skills.** Cheap, but needs Claude Code open, and the web depends on repo internals.
2. **Web app calls the Claude API directly.** Standalone, clean UI. Costs per call. **Chosen by the user.**
3. **Keyword-only scoring, no AI.** Free, but poor at judging fit and company quality. Kept only as a fallback when no API key is set.

## Parts

1. **Profile form** (web UI): identity, experience, skills, education, languages, goals. Saved to a local JSON file.
2. **CV generator**: fills a LaTeX template from the profile via a Claude call, then compiles with lualatex. Output: `cv/main_<date>.pdf`.
3. **CV reviewer**: one Claude call, returns a score per section and a list of concrete fixes.
4. **Job search**: runs the existing portal CLIs (Jobindex, Jobnet, etc.) and new VN portal CLIs once they exist. Results are deduplicated through `tools/scrape_state.py`.
5. **Job scorer**: one Haiku call per job, returns fit score, reasons, and gaps against the profile.
6. **Company assessor**: one call per company, using public web sources. Every claim carries its source URL. Unverified claims are marked as such.
7. **Local web UI**: a single page with tabs: Profile, CV, Jobs. Served on localhost only. Built in two halves: UI by Antigravity, logic by Claude (see UI split).

## UI split (Antigravity + Claude)

- Claude writes `docs/ui-spec.md`: each screen, its fields, its states (empty, loading, error), and the JSON shape each screen reads and writes. Includes sample JSON.
- Antigravity builds the UI from that spec in `ui/`, using the ui-ux-pro-max design direction. It works against the sample JSON only, and makes no API or CLI calls.
- Claude writes the server routes in `server/` and the logic behind them, then swaps the sample JSON for real responses. Claude checks each route against the spec.
- The spec is the single source. A field change goes into the spec first, then both sides follow it.
- First pilot: the Profile form only. It tests the handoff before the CV, scoring, and job screens are built.

## What is left to the builder

- Stack for the web server: FastAPI (Python) or Express (bun). Pick whichever has fewer files.
- LaTeX template handling: reuse `cv/` templates; the builder decides how to inject profile fields.
- Storage for scored jobs: a JSON file under `job_scraper/`, matching the `seen_jobs.json` shape.
- Cost guard: a per-run cap on the number of API calls, shown in the UI.

## Calls made without asking

- Scoring uses Haiku, CV work uses Sonnet. Both can be changed in one config value.
- The Vietnamese portal CLIs are a separate step, after the core app works.
- Company assessment is limited to public web sources. No paid data.

## Open questions for the user

- Approve this design, or change the approach?
- Should the Vietnamese portal CLIs be built in the first version, or in a second pass?
