import { test, expect } from "@playwright/test";

async function registerUser(page: import("@playwright/test").Page) {
  const email = `api-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await page.request.post("/api/auth/register", {
    data: { email, password: "password123", name: "API Test User" },
  });
  expect(res.status()).toBe(200);
  return email;
}

test.describe("API routes — auth enforcement", () => {
  test("GET /api/posts returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/posts");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/posts returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/posts", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/generate returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/generate", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("PUT /api/brand returns 401 without auth", async ({ request }) => {
    const res = await request.put("/api/brand", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/schedule returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/schedule", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("GET /api/analytics returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/analytics");
    expect(res.status()).toBe(401);
  });

  test("POST /api/generate/regenerate returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/generate/regenerate", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("POST /api/generate/image-prompts returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/generate/image-prompts", { data: {} });
    expect(res.status()).toBe(401);
  });
});

test.describe("API routes — validation with auth", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page);
  });

  test("GET /api/posts with invalid status returns 400", async ({ page }) => {
    const res = await page.request.get("/api/posts?status=INVALID");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/posts with invalid platform returns 400", async ({ page }) => {
    const res = await page.request.get("/api/posts?platform=INVALID");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/posts with empty body returns 400 with error JSON", async ({ page }) => {
    const res = await page.request.post("/api/posts", { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/posts with valid data creates a draft", async ({ page }) => {
    const res = await page.request.post("/api/posts", {
      data: {
        topic: "Test topic",
        platform: "TWITTER",
        content: "Hello world",
        tone: "professional",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.post).toBeDefined();
    expect(body.post.status).toBe("DRAFT");
    expect(body.post.id).toBeTruthy();
  });

  test("POST /api/schedule with invalid body returns 400", async ({ page }) => {
    const res = await page.request.post("/api/schedule", { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/schedule with empty postId returns 400", async ({ page }) => {
    const res = await page.request.post("/api/schedule", {
      data: { postId: "", scheduledAt: new Date().toISOString() },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("PUT /api/brand with valid data saves brand voice", async ({ page }) => {
    const res = await page.request.put("/api/brand", {
      data: {
        businessName: "Test Brand",
        industry: "Tech / SaaS",
        targetAudience: "Developers",
        toneKeywords: ["Professional", "Concise"],
        examplePost: null,
        avoidWords: [],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand).toBeDefined();
    expect(body.brand.businessName).toBe("Test Brand");
  });

  test("PUT /api/brand with oversized toneKeywords returns 400", async ({ page }) => {
    const res = await page.request.put("/api/brand", {
      data: {
        toneKeywords: Array.from({ length: 20 }, (_, i) => `Keyword${i}`),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/analytics returns data", async ({ page }) => {
    const res = await page.request.get("/api/analytics");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totals");
    expect(body).toHaveProperty("byPlatform");
    expect(body).toHaveProperty("perDay");
    expect(body).toHaveProperty("tones");
    expect(body).toHaveProperty("streak");
  });

  test("GET /api/posts with valid status filter returns 200", async ({ page }) => {
    const res = await page.request.get("/api/posts?status=DRAFT");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.posts)).toBe(true);
  });

  test("POST /api/generate returns SSE stream", async ({ page }) => {
    const res = await page.request.post("/api/generate", {
      data: {
        topic: "Test topic for streaming",
        platforms: ["TWITTER"],
        tone: "professional",
      },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/event-stream");
  });
});
