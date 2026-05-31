import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("register page renders with form fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Create your account");
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("/api/auth/me returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("/api/auth/register returns JSON error on bad input", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "not-an-email", password: "12" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("/api/auth/login returns JSON error on wrong password", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "nonexistent@example.com", password: "wrong" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Invalid email or password.");
  });

  test("register via API creates valid session", async ({ page }) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
    const res = await page.request.post("/api/auth/register", {
      data: { email, password: "password123", name: "Test User" },
    });
    expect(res.status()).toBe(200);

    // Session is now active — verify by calling /api/auth/me
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const body = await meRes.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  test("register, logout, login, verify dashboard", async ({ page }) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

    // Register via API
    const regRes = await page.request.post("/api/auth/register", {
      data: { email, password: "password123", name: "Test User" },
    });
    expect(regRes.status()).toBe(200);

    // Logout (clear cookies stored in browser context)
    await page.context().clearCookies();

    // Login via API
    const loginRes = await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });
    expect(loginRes.status()).toBe(200);

    // Navigate to dashboard — should show the welcome message
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Welcome");
  });

  test("/api/auth/me returns user after register", async ({ page }) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

    // Register via API
    const regRes = await page.request.post("/api/auth/register", {
      data: { email, password: "password123", name: "Test User" },
    });
    expect(regRes.status()).toBe(200);

    // Verify the API returns user data
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const body = await meRes.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
    expect(body.user.name).toBe("Test User");
  });
});
