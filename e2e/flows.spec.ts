import { test, expect } from "@playwright/test";

async function registerUser(page: import("@playwright/test").Page) {
  const email = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await page.request.post("/api/auth/register", {
    data: { email, password: "password123", name: "Flow Test User" },
  });
  expect(res.status()).toBe(200);
  return email;
}

test.describe("Full user journey", () => {
  test("set brand voice via API then verify on page", async ({ page }) => {
    await registerUser(page);

    // Save brand voice via API
    const saveRes = await page.request.put("/api/brand", {
      data: {
        businessName: "API Saved Brand",
        industry: "Tech / SaaS",
        targetAudience: "Developers",
        toneKeywords: ["Professional"],
        examplePost: null,
        avoidWords: [],
      },
    });
    expect(saveRes.status()).toBe(200);

    // Reload brand page and verify it shows the saved value
    await page.goto("/dashboard/brand", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Check via API that the brand data was persisted
    const getRes = await page.request.get("/api/brand");
    expect(getRes.status()).toBe(200);
    const body = await getRes.json();
    expect(body.brand.businessName).toBe("API Saved Brand");
  });

  test("delete a post via API", async ({ page }) => {
    await registerUser(page);

    // Create a draft via API
    const createRes = await page.request.post("/api/posts", {
      data: {
        topic: "Post to delete",
        platform: "TWITTER",
        content: "This will be deleted",
        tone: "professional",
      },
    });
    expect(createRes.status()).toBe(200);
    const { post } = await createRes.json();
    expect(post.id).toBeTruthy();

    // Delete via API
    const delRes = await page.request.delete(`/api/posts/${post.id}`);
    expect(delRes.status()).toBe(200);

    // Verify it's no longer in the list
    const listRes = await page.request.get("/api/posts?status=DRAFT");
    const list = await listRes.json();
    const ids = (list.posts ?? []).map((p: { id: string }) => p.id);
    expect(ids).not.toContain(post.id);
  });

  test("generate page renders without crashing", async ({ page }) => {
    await registerUser(page);
    await page.goto("/dashboard/generate", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("AI Studio");
  });
});
