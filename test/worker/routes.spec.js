import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("한영이음 Worker API routing", () => {
  it("rejects a missing lookup word", async () => {
    const response = await exports.default.fetch("https://example.test/api/lookup");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "검색할 단어를 입력해 주세요." });
  });

  it("rejects unsupported methods", async () => {
    const response = await exports.default.fetch("https://example.test/api/lookup?word=hello", {
      method: "POST"
    });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await exports.default.fetch("https://example.test/api/unknown");
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });
});
