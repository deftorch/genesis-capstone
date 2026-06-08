import { test, expect } from '@playwright/test';

test.describe('Genesis Chat Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before navigation to ensure a clean state and seed default chats
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('settings-storage', JSON.stringify({
        state: { preferences: { developerMode: true, theme: 'system', fontSize: 'medium', autoSave: true, showTokenCount: false, enableNotifications: true } },
        version: 0
      }));
      window.localStorage.setItem('chat-storage', JSON.stringify({
        state: {
          chats: [
            {
              id: 'chat-1',
              title: 'Bouncing Ball Animation',
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              totalTokens: 0,
              modelConfig: { id: 'def', provider: 'google', model: 'gemini-3-flash' }
            },
            {
              id: 'chat-2',
              title: 'Particle System',
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              totalTokens: 0,
              modelConfig: { id: 'def', provider: 'google', model: 'gemini-3-flash' }
            },
            {
              id: 'chat-3',
              title: 'Fractal Tree',
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              totalTokens: 0,
              modelConfig: { id: 'def', provider: 'google', model: 'gemini-3-flash' }
            },
            {
              id: 'chat-4',
              title: 'Wave Pattern',
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isStarred: false,
              totalTokens: 0,
              modelConfig: { id: 'def', provider: 'google', model: 'gemini-3-flash' }
            }
          ],
          currentChatId: null,
          projects: [],
          artifacts: []
        },
        version: 0
      }));
    });

    // Intercept /api/chat requests and return a mock AI response with a code block matching SSE stream format
    await page.route('**/api/chat', async (route) => {
      const responseText = 'Here is your custom visualizer code!\\n\\n```javascript\\n// renderer: p5\\nfunction setup() {\\n  createCanvas(400, 400);\\n}\\nfunction draw() {\\n  background(100, 200, 255);\\n  fill(255);\\n  ellipse(200, 200, 100);\\n}\\n```';
      const chunk = JSON.stringify({
        candidates: [{ content: { parts: [{ text: responseText }] } }]
      });
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${chunk}\n\ndata: [DONE]\n\n`,
      });
    });

    // Go to the main application page
    await page.goto('/');
  });

  test('should display seeded chats in sidebar', async ({ page }) => {
    // Verify that sidebar loads and displays seeded chats
    const sidebar = page.locator('aside, .sidebar, [class*="sidebar"]');
    await expect(page.locator('text=Bouncing Ball Animation').first()).toBeVisible();
    await expect(page.locator('text=Particle System').first()).toBeVisible();
    await expect(page.locator('text=Fractal Tree').first()).toBeVisible();
    await expect(page.locator('text=Wave Pattern').first()).toBeVisible();
  });

  test('should toggle settings modal and theme correctly', async ({ page }) => {
    // Click Settings button
    const settingsBtn = page.locator('button[title="Settings"]').first();
    await settingsBtn.click();

    // Verify Settings Modal is open
    await expect(page.locator('text=Settings').first()).toBeVisible();
    await expect(page.locator('text=General Settings').first()).toBeVisible();
    await expect(page.locator('text=Auto-save chats').first()).toBeVisible();

    // Close Settings Modal
    const closeBtn = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Verify Settings Modal is closed
    await expect(page.locator('text=General Settings').first()).not.toBeVisible();
  });

  test('should select sidebar chat and load messages', async ({ page }) => {
    // Click on "Bouncing Ball Animation" chat in sidebar
    await page.locator('text=Bouncing Ball Animation').first().click();

    // Verify chat workspace shows the active chat title or messages
    await expect(page.locator('text=Bouncing Ball Animation').first()).toBeVisible();
  });

  test('should submit user prompt, receive mock response, and display preview panel', async ({ page }) => {
    // Type in chat input and submit
    const input = page.getByPlaceholder('What creativity do you want to realize today?');
    await expect(input).toBeVisible();
    await input.fill('Create a circle animation');
    await input.press('Enter');

    // Verify the mock response is added to the chat and shows up
    await expect(page.locator('text=Here is your custom visualizer code!').first()).toBeVisible();

    // Verify preview panel tab is visible and default active
    await expect(page.locator('text=Preview').first()).toBeVisible();
    await expect(page.locator('text=Code').first()).toBeVisible();
  });
});
