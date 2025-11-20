from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_admin_page(page: Page):
    # 1. Navigate to the admin page
    print("Navigating to /admin...")
    page.goto("http://localhost:3000/admin")

    # 2. Wait for the page to load (stats, etc.)
    print("Waiting for page content...")
    # We can wait for "Admin Console" heading
    expect(page.get_by_role("heading", name="Content Operations")).to_be_visible(timeout=15000)

    # Check if we see the components we refactored

    # 3. Check Stats
    print("Checking Stats...")
    expect(page.get_by_text("Stats").first).to_be_visible()
    expect(page.get_by_role("button", name="Refresh stats")).to_be_visible()

    # 4. Check Sanity Sync
    print("Checking Sanity Sync...")
    expect(page.get_by_text("Sanity Sync")).to_be_visible()
    expect(page.get_by_role("button", name="Preview")).to_be_visible()
    expect(page.get_by_role("button", name="Sync Now")).to_be_visible()

    # 5. Check Inline Editing
    print("Checking Inline Editing...")
    expect(page.get_by_text("Inline editing")).to_be_visible()
    expect(page.get_by_role("button", name="Open homepage")).to_be_visible()

    # 6. Check Destinations
    print("Checking Destinations...")
    expect(page.get_by_text("Search, edit, or delete any record in the catalog.")).to_be_visible()
    expect(page.get_by_role("button", name="Add place")).to_be_visible()

    # Take a screenshot of the dashboard
    print("Taking dashboard screenshot...")
    page.screenshot(path="/home/jules/verification/admin_dashboard.png", full_page=True)

    # 7. Open "Add place" modal to verify DestinationForm
    print("Opening 'Add place' modal...")
    # Force click to bypass potential toast overlay
    page.get_by_role("button", name="Add place").click(force=True)

    expect(page.get_by_role("heading", name="Create New Destination")).to_be_visible()
    expect(page.get_by_text("Basic Information")).to_be_visible()
    expect(page.get_by_text("Image")).to_be_visible()
    expect(page.get_by_text("Content")).to_be_visible()

    # Take screenshot of modal
    print("Taking modal screenshot...")
    page.screenshot(path="/home/jules/verification/admin_modal.png", full_page=True)

    # Close modal
    page.get_by_role("button", name="Cancel").click(force=True)


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1200})
        page = context.new_page()

        try:
            verify_admin_page(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
