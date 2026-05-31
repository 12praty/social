import { test, expect } from "@playwright/test";

async function registerUser(page: import("@playwright/test").Page) {
  const email = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await page.request.post("/api/auth/register", {
    data: { email, password: "password123", name: "Route Test" },
  });
  expect(res.status()).toBe(200);
  return email;
}

test.describe("Untested API routes", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("POST /api/auth/logout clears session", async ({ page }) => {
    await registerUser(page);

    // Verify session exists
    let me = await page.request.get("/api/auth/me");
    expect(me.status()).toBe(200);

    // Logout
    const logoutRes = await page.request.post("/api/auth/logout");
    expect(logoutRes.status()).toBe(200);
    const body = await logoutRes.json();
    expect(body.ok).toBe(true);

    // Verify session cleared
    me = await page.request.get("/api/auth/me");
    expect(me.status()).toBe(401);
  });

  test("GET /api/posts/[id] returns single post", async ({ page }) => {
    await registerUser(page);

    // Create a post
    const createRes = await page.request.post("/api/posts", {
      data: { topic: "Single post", platform: "TWITTER", content: "Test", tone: "professional" },
    });
    expect(createRes.status()).toBe(200);
    const { post } = await createRes.json();

    // Fetch single post
    const getRes = await page.request.get(`/api/posts/${post.id}`);
    expect(getRes.status()).toBe(200);
    const single = await getRes.json();
    expect(single.post.id).toBe(post.id);
    expect(single.post.topic).toBe("Single post");
  });

  test("GET /api/posts/[id] returns 404 for nonexistent post", async ({ page }) => {
    await registerUser(page);
    const res = await page.request.get("/api/posts/nonexistent-id");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("PATCH /api/posts/[id] updates post content", async ({ page }) => {
    await registerUser(page);

    // Create a post
    const createRes = await page.request.post("/api/posts", {
      data: { topic: "Edit me", platform: "LINKEDIN", content: "Original content", tone: "professional" },
    });
    expect(createRes.status()).toBe(200);
    const { post } = await createRes.json();

    // Edit the post
    const patchRes = await page.request.patch(`/api/posts/${post.id}`, {
      data: { content: "Updated content" },
    });
    expect(patchRes.status()).toBe(200);

    // Verify edit
    const getRes = await page.request.get(`/api/posts/${post.id}`);
    const updated = await getRes.json();
    expect(updated.post.content).toBe("Updated content");
  });

  test("PATCH /api/posts/[id] returns 404 for nonexistent post", async ({ page }) => {
    await registerUser(page);
    const res = await page.request.patch("/api/posts/nonexistent-id", {
      data: { content: "test" },
    });
    expect(res.status()).toBe(404);
  });

  test("DELETE /api/posts/[id] returns 404 for nonexistent post", async ({ page }) => {
    await registerUser(page);
    const res = await page.request.delete("/api/posts/nonexistent-id");
    expect(res.status()).toBe(404);
  });

  test("DELETE /api/schedule/[postId] returns 404 for nonexistent", async ({ page }) => {
    await registerUser(page);
    const res = await page.request.delete("/api/schedule/nonexistent-id");
    expect(res.status()).toBe(404);
  });

  test("DELETE then verify post is removed", async ({ page }) => {
    await registerUser(page);

    const createRes = await page.request.post("/api/posts", {
      data: { topic: "Delete me", platform: "TWITTER", content: "Gone soon", tone: "professional" },
    });
    expect(createRes.status()).toBe(200);
    const { post } = await createRes.json();

    const delRes = await page.request.delete(`/api/posts/${post.id}`);
    expect(delRes.status()).toBe(200);

    const getRes = await page.request.get(`/api/posts/${post.id}`);
    expect(getRes.status()).toBe(404);
  });

  test("GET /api/schedule/tick returns 403 with wrong secret", async ({ request }) => {
    const res = await request.get("/api/schedule/tick?secret=wrong-secret");
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  test("GET /api/brand returns brand data", async ({ page }) => {
    await registerUser(page);

    // Save brand voice first
    await page.request.put("/api/brand", {
      data: {
        businessName: "Fetch Test",
        industry: "Tech / SaaS",
        targetAudience: "Developers",
        toneKeywords: ["Professional"],
        examplePost: null,
        avoidWords: [],
      },
    });

    // Fetch brand
    const res = await page.request.get("/api/brand");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.brand.businessName).toBe("Fetch Test");
  });
});
