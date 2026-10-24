// Local API for the Profile and CV screens. Binds to 127.0.0.1 only; the UI origin is allowed for CORS.
import { join } from "node:path";
import { validateProfile } from "./profile";
import { compileCv, reviewCv, CvError, DATA, PDF, TEX } from "./cv";

const PROFILE = join(DATA, "profile.json");
const ORIGIN = "http://localhost:5173";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const readProfile = async () => {
  const f = Bun.file(PROFILE);
  return (await f.exists()) ? f.json() : null;
};

Bun.serve({
  hostname: "127.0.0.1",
  port: 8000,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return json(null, 204);

    if (pathname === "/api/profile" && req.method === "GET") {
      const p = await readProfile();
      return p ? json(p) : json({ ok: false, error: "not_found" }, 404);
    }
    if (pathname === "/api/profile" && req.method === "PUT") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return json({ ok: false, errors: { profile: "JSON không hợp lệ" } }, 400);
      }
      const errors = validateProfile(body);
      if (Object.keys(errors).length) return json({ ok: false, errors }, 400);
      await Bun.write(PROFILE, JSON.stringify(body, null, 2));
      return json({ ok: true, saved_at: new Date().toISOString() });
    }

    if (pathname === "/api/cv/generate" && req.method === "POST") {
      const p = await readProfile();
      if (!p) return json({ ok: false, error: "profile_missing" }, 409);
      try {
        await compileCv(p);
        return json({ ok: true, generated_at: new Date().toISOString() });
      } catch (err) {
        console.error("generate:", err instanceof Error ? err.message : err);
        return json({ ok: false, error: "generate_failed" }, 500);
      }
    }

    if (pathname === "/api/cv/pdf" && req.method === "GET") {
      const f = Bun.file(PDF);
      return (await f.exists())
        ? new Response(f, { headers: { ...CORS, "Content-Type": "application/pdf" } })
        : json({ ok: false, error: "no_cv" }, 404);
    }

    if (pathname === "/api/cv/review" && req.method === "POST") {
      const tex = Bun.file(TEX);
      if (!(await tex.exists())) return json({ ok: false, error: "no_cv" }, 409);
      try {
        return json({ ok: true, ...(await reviewCv(await tex.text())) });
      } catch (err) {
        console.error("review:", err instanceof CvError ? err.message : err);
        return json({ ok: false, error: "review_failed" }, 500);
      }
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
});
console.log("API listening on http://127.0.0.1:8000");
