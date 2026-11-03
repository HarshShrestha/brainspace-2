import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * End-to-end user journeys. Serial: later journeys build on the owner account and items
 * created earlier, which keeps sign-ups well below the registration rate limit.
 */
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36).slice(-5);
const OWNER = `owner_${RUN}`;
const FRIEND = `friend_${RUN}`;
const PASSWORD = "correct horse battery staple";
const SOURCE =
  "The project uses blue cards for each source. Every card links back to the original page so readers can verify it.";

let ownerContext: BrowserContext;
let owner: Page;
let shareLink = "";
const consoleErrors: string[] = [];

/**
 * Collects JavaScript errors and server failures. 4xx responses are part of normal flows here
 * (session checks, revoked links, a deliberately refused folder deletion) and are asserted via the UI.
 */
function watch(page: Page) {
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) consoleErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource"))
      consoleErrors.push(message.text());
  });
}

async function register(page: Page, username: string) {
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
}

async function addItem(
  page: Page,
  item: { title: string; link: string; tags: string; type?: string; folder?: string },
) {
  await page.getByRole("button", { name: "New item" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(item.title);
  await dialog.getByLabel("Link").fill(item.link);
  await dialog.getByLabel("Type").selectOption(item.type ?? "article");
  await dialog.getByLabel("Folder").selectOption({ label: item.folder ?? "No folder" });
  await dialog.getByLabel("Tags").fill(item.tags);
  await dialog.getByRole("button", { name: "Save to space" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

const cards = (page: Page) => page.locator(".card");

async function newPage(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  watch(page);
  return { context, page };
}

test.beforeAll(async ({ browser }) => {
  ({ context: ownerContext, page: owner } = await newPage(browser));
});

test.afterAll(async () => {
  await ownerContext.close();
  expect(consoleErrors, "unexpected browser errors").toEqual([]);
});

test("registration validates input and signs the user in", async () => {
  await owner.goto("/");
  await expect(owner).toHaveURL(/\/login$/);
  await owner.getByRole("link", { name: "Create an account" }).click();
  await owner.getByLabel("Username").fill("x!");
  await owner.getByLabel("Password").fill("short");
  await owner.getByRole("button", { name: "Create account" }).click();
  await expect(owner.getByText("Use 3–30 letters, numbers or underscores")).toBeVisible();
  await expect(owner.getByText("Use at least 8 characters")).toBeVisible();

  await register(owner, OWNER);
  await expect(owner.getByText("Space to think")).toBeVisible();
});

test("library: folders, items, search, filters, edit, move and delete", async () => {
  await owner.getByRole("button", { name: "New folder" }).click();
  await owner.getByLabel("Folder name").fill("Research");
  await owner.getByRole("button", { name: "Create folder" }).click();
  await expect(owner.getByRole("heading", { name: "Research" })).toBeVisible();

  await owner.getByRole("link", { name: "Library" }).click();
  await addItem(owner, { title: "Design notes", link: "https://design.example.com/notes", tags: "design, product" });
  await addItem(owner, {
    title: "Rust ownership",
    link: "https://blog.example.org/rust",
    tags: "rust",
    folder: "Research",
  });
  await addItem(owner, { title: "Jazz podcast", link: "https://music.example.net/jazz", tags: "music", type: "audio" });
  await addItem(owner, { title: "Temporary", link: "https://tmp.example.com", tags: "" });
  await expect(cards(owner)).toHaveCount(4);

  await owner.getByRole("searchbox").fill("rust");
  await expect(cards(owner)).toHaveCount(1);
  await expect(owner).toHaveURL(/q=rust/);
  await owner.getByRole("button", { name: "Clear filters" }).click();
  await owner.getByRole("button", { name: "#music" }).click();
  await expect(cards(owner)).toHaveCount(1);
  await owner.getByRole("button", { name: "Clear filters" }).click();

  await owner.getByRole("button", { name: "Edit Design notes" }).click();
  await owner.getByRole("dialog").getByLabel("Title").fill("Design notes v2");
  await owner.getByRole("button", { name: "Save changes" }).click();
  await expect(owner.getByRole("link", { name: "Design notes v2" })).toBeVisible();

  await owner.getByLabel("Move Jazz podcast to folder").selectOption({ label: "Research" });
  await expect(owner.getByText("Moved to “Research”")).toBeVisible();
  await owner
    .locator("nav")
    .getByRole("link", { name: /Research/ })
    .click();
  await expect(cards(owner)).toHaveCount(2);
  await expect(owner.getByText("2 items")).toBeVisible();

  await owner.getByRole("button", { name: "Delete folder" }).click();
  await owner.getByRole("dialog").getByRole("button", { name: "Delete folder" }).click();
  await expect(owner.getByRole("dialog").getByRole("alert")).toContainText("Move all items out");
  await owner.getByRole("button", { name: "Cancel" }).click();

  await owner.getByRole("link", { name: "Library" }).click();
  await owner.getByRole("button", { name: "Delete Temporary" }).click();
  await owner.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(cards(owner)).toHaveCount(3);
});

test("assistant: consent-gated indexing, cited answers and abstention", async () => {
  await owner.getByRole("button", { name: "Index Design notes v2 for AI" }).click();
  const dialog = owner.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Index source" })).toBeDisabled();
  await dialog.getByLabel("Source text").fill(SOURCE);
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Index source" }).click();
  await expect(owner.getByText("AI ready")).toBeVisible();

  await owner.getByRole("link", { name: "Ask your space" }).click();
  await expect(owner.getByText("1 of 250 sources ready")).toBeVisible();
  const question = owner.getByLabel("Ask a question about your indexed sources");
  await question.fill("Which cards does the project use?");
  await owner.getByRole("button", { name: "Ask" }).click();
  await expect(owner.locator(".evidence blockquote")).toContainText("The project uses blue cards for each source.");
  await expect(owner.getByRole("link", { name: "Design notes v2" }).last()).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );

  await question.fill("Quantum chromodynamics lattice gauge theory");
  await owner.getByRole("button", { name: "Ask" }).click();
  await expect(owner.getByText("No confident answer")).toBeVisible();
});

test("sharing: public read-only link, shared with me and revocation", async ({ browser }) => {
  await owner.getByRole("button", { name: "Share" }).click();
  await owner.getByRole("button", { name: "Create link" }).click();
  shareLink = await owner.getByLabel("Your share link").inputValue();
  expect(shareLink).toMatch(/\/shared\/[A-Za-z0-9_-]{43}$/);
  await owner.getByRole("button", { name: "Close" }).click();

  const visitor = await newPage(browser);
  await visitor.page.goto(shareLink);
  await expect(visitor.page.getByRole("heading", { name: `${OWNER}’s space` })).toBeVisible();
  await expect(cards(visitor.page)).toHaveCount(3);
  await expect(visitor.page.getByRole("button", { name: /Delete|Edit/ })).toHaveCount(0);

  const friend = await newPage(browser);
  await register(friend.page, FRIEND);
  await friend.page.getByRole("link", { name: "Shared with me" }).click();
  await friend.page.getByLabel("Add a shared space").fill(shareLink);
  await friend.page.getByRole("button", { name: "Add", exact: true }).click();
  await friend.page.getByRole("link", { name: `${OWNER}’s space` }).click();
  await expect(cards(friend.page)).toHaveCount(3);

  await owner.getByRole("button", { name: "Share" }).click();
  await owner.getByRole("button", { name: "Turn off sharing" }).click();
  await expect(owner.getByText("Sharing turned off")).toBeVisible();
  await owner.getByRole("button", { name: "Close" }).click();

  await friend.page.locator("nav").getByRole("link", { name: "Shared with me" }).click();
  await expect(friend.page.getByText("Unavailable space")).toBeVisible();
  await visitor.page.reload();
  await expect(visitor.page.getByText("no longer shared")).toBeVisible();
  await Promise.all([visitor.context.close(), friend.context.close()]);
});

test("preferences: dark mode persists and the layout fits a phone", async ({ browser }) => {
  await owner.getByRole("link", { name: "Library" }).click();
  await owner.getByRole("button", { name: "Switch to dark mode" }).click();
  await owner.reload();
  await expect(owner.locator("html")).toHaveAttribute("data-theme", "dark");

  const phone = await newPage(browser, {
    viewport: { width: 390, height: 844 },
    storageState: await ownerContext.storageState(),
  });
  await phone.page.goto("/");
  await expect(cards(phone.page)).toHaveCount(3);
  const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
  await phone.page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(phone.page.locator(".sidebar--open")).toBeVisible();
  await phone.page.getByRole("link", { name: "Shared with me" }).click();
  await expect(phone.page.locator(".sidebar--open")).toHaveCount(0);
  await phone.context.close();
});

test("sign-out ends sessions on every device", async ({ browser }) => {
  const second = await newPage(browser, { storageState: await ownerContext.storageState() });
  await second.page.goto("/");
  await expect(second.page.getByRole("heading", { name: "Library" })).toBeVisible();

  await owner.getByRole("button", { name: "Account menu" }).click();
  await owner.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(owner).toHaveURL(/\/login$/);

  await second.page.reload();
  await expect(second.page).toHaveURL(/\/login/);
  await second.context.close();
});
