import { test, expect } from "@playwright/test";

test.describe("Full lifecycle", () => {
  test("Register → Brand → Generate → Edit → Schedule → Calendar → Verify", async ({ page }) => {
    const email = `lifecycle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

    // 1. Register
    const regRes = await page.request.post("/api/auth/register", {
      data: { email, password: "password123", name: "Lifecycle User" },
    });
    expect(regRes.status()).toBe(200);

    // 2. Set brand voice
    const brandRes = await page.request.put("/api/brand", {
      data: {
        businessName: "Lifecycle Brand",
        industry: "Tech / SaaS",
        targetAudience: "Developers",
        toneKeywords: ["Professional", "Concise"],
        examplePost: null,
        avoidWords: [],
      },
    });
    expect(brandRes.status()).toBe(200);
    expect((await brandRes.json()).brand.businessName).toBe("Lifecycle Brand");

    // 3. Verify brand page renders
    await page.goto("/dashboard/brand", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Brand voice");

    // 4. Navigate to generate page
    await page.goto("/dashboard/generate", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("AI Studio");

    // 5. Create a post via API (as generate requires Gemini API)
    const createRes = await page.request.post("/api/posts", {
      data: {
        topic: "Lifecycle test post",
        platform: "LINKEDIN",
        content: "This is a lifecycle test post content",
        tone: "professional",
      },
    });
    expect(createRes.status()).toBe(200);
    const { post } = await createRes.json();
    expect(post.id).toBeTruthy();
    expect(post.status).toBe("DRAFT");

    // 6. Edit the post
    const patchRes = await page.request.patch(`/api/posts/${post.id}`, {
      data: { content: "Updated lifecycle test content" },
    });
    expect(patchRes.status()).toBe(200);

    // 7. Verify edit persisted
    const getRes = await page.request.get(`/api/posts/${post.id}`);
    expect((await getRes.json()).post.content).toBe("Updated lifecycle test content");

    // 8. Schedule the post
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const schedRes = await page.request.post("/api/schedule", {
      data: { postId: post.id, scheduledAt: futureDate },
    });
    expect(schedRes.status()).toBe(200);
    const schedBody = await schedRes.json();
    expect(schedBody.post).toBeDefined();
    expect(schedBody.post.status).toBe("SCHEDULED");

    // 9. Verify post is now SCHEDULED
    const getSched = await page.request.get(`/api/posts/${post.id}`);
    expect((await getSched.json()).post.status).toBe("SCHEDULED");

    // 10. Navigate to calendar and verify
    await page.goto("/dashboard/calendar", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Content calendar");

    // 11. Unschedule the post
    const unschedRes = await page.request.delete(`/api/schedule/${post.id}`);
    expect(unschedRes.status()).toBe(200);

    // 12. Verify back to DRAFT
    const getUnsched = await page.request.get(`/api/posts/${post.id}`);
    expect((await getUnsched.json()).post.status).toBe("DRAFT");

    // 13. Delete the post
    const delRes = await page.request.delete(`/api/posts/${post.id}`);
    expect(delRes.status()).toBe(200);

    // 14. Verify deleted
    const getDeleted = await page.request.get(`/api/posts/${post.id}`);
    expect(getDeleted.status()).toBe(404);

    // 15. Verify analytics API works
    const analyticsRes = await page.request.get("/api/analytics");
    expect(analyticsRes.status()).toBe(200);
  });
});
