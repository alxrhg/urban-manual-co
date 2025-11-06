/**
 * Scrape Michelin Guide Data using Playwright
 *
 * This script scrapes restaurant and hotel data from the Michelin Guide website.
 * It collects star ratings for restaurants and key ratings for hotels.
 *
 * Requirements:
 * - Playwright installed with browsers: npx playwright install chromium
 * - Stable internet connection
 * - Respectful scraping delays to avoid rate limiting
 *
 * Usage:
 *   tsx scripts/scrape-michelin-guide.ts --type restaurants --city paris --output data/michelin/paris-restaurants.json
 *   tsx scripts/scrape-michelin-guide.ts --type hotels --city tokyo --output data/michelin/tokyo-hotels.json
 *
 * Note: The Michelin Guide website has anti-bot protection.
 * This script uses stealth techniques and random delays to avoid detection.
 */

import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

interface ScrapedEntry {
  name: string;
  city: string;
  country?: string;
  stars?: number;
  keys?: number;
  crown?: boolean;
  michelin_guide_url?: string;
  category?: string;
}

interface ScraperOptions {
  type: 'restaurants' | 'hotels';
  city: string;
  country?: string;
  outputFile: string;
  maxPages?: number;
  delayMs?: number;
}

/**
 * Random delay between requests to avoid detection
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1) + min)
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Initialize browser with stealth settings
 */
async function initBrowser(): Promise<Browser> {
  console.log('🌐 Launching browser...')

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })

  return browser
}

/**
 * Setup page with anti-detection measures
 */
async function setupPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  })

  const page = await context.newPage()

  // Override navigator.webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
  })

  return page
}

/**
 * Scrape restaurants from Michelin Guide
 */
async function scrapeRestaurants(
  page: Page,
  city: string,
  maxPages: number = 5,
  delayMs: number = 3000
): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  const baseUrl = `https://guide.michelin.com/en/restaurants`

  console.log(`\n🍴 Scraping Michelin restaurants in ${city}...`)

  try {
    // Navigate to restaurants page with city filter
    const searchUrl = `${baseUrl}?q=${encodeURIComponent(city)}`
    console.log(`📍 Navigating to: ${searchUrl}`)

    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await randomDelay(delayMs, delayMs + 2000)

    // Wait for restaurant cards to load
    await page.waitForSelector('.card__menu', { timeout: 30000 }).catch(() => {
      console.log('⚠️  No restaurant cards found, page may have different structure')
    })

    // Extract restaurant data
    const restaurants = await page.$$eval('.card__menu', (cards, cityName) => {
      return cards.map(card => {
        const nameEl = card.querySelector('.card__menu-content--title')
        const starsEl = card.querySelectorAll('.michelin-award__icon--stars')
        const crownEl = card.querySelector('.michelin-award__icon--bib-gourmand')
        const linkEl = card.querySelector('a[href]')

        const name = nameEl?.textContent?.trim() || ''
        const stars = starsEl.length
        const crown = !!crownEl
        const url = linkEl?.getAttribute('href') || ''

        return {
          name,
          city: cityName,
          stars: stars > 0 ? stars : undefined,
          crown,
          michelin_guide_url: url ? `https://guide.michelin.com${url}` : undefined,
          category: 'Restaurants',
        }
      }).filter(r => r.name !== '')
    }, city)

    results.push(...restaurants)
    console.log(`✅ Scraped ${restaurants.length} restaurants`)

  } catch (error: any) {
    console.error(`❌ Error scraping restaurants: ${error.message}`)
  }

  return results
}

/**
 * Scrape hotels from Michelin Guide
 */
async function scrapeHotels(
  page: Page,
  city: string,
  maxPages: number = 5,
  delayMs: number = 3000
): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  const baseUrl = `https://guide.michelin.com/en/hotels`

  console.log(`\n🏨 Scraping Michelin Key hotels in ${city}...`)

  try {
    // Navigate to hotels page with city filter
    const searchUrl = `${baseUrl}?q=${encodeURIComponent(city)}`
    console.log(`📍 Navigating to: ${searchUrl}`)

    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 })
    await randomDelay(delayMs, delayMs + 2000)

    // Wait for hotel cards to load
    await page.waitForSelector('.card__menu', { timeout: 30000 }).catch(() => {
      console.log('⚠️  No hotel cards found, page may have different structure')
    })

    // Extract hotel data
    const hotels = await page.$$eval('.card__menu', (cards, cityName) => {
      return cards.map(card => {
        const nameEl = card.querySelector('.card__menu-content--title')
        const keysEl = card.querySelectorAll('.michelin-award__icon--keys')
        const linkEl = card.querySelector('a[href]')

        const name = nameEl?.textContent?.trim() || ''
        const keys = keysEl.length
        const url = linkEl?.getAttribute('href') || ''

        return {
          name,
          city: cityName,
          keys: keys > 0 ? keys : undefined,
          michelin_guide_url: url ? `https://guide.michelin.com${url}` : undefined,
          category: 'Hotels',
        }
      }).filter(h => h.name !== '')
    }, city)

    results.push(...hotels)
    console.log(`✅ Scraped ${hotels.length} hotels`)

  } catch (error: any) {
    console.error(`❌ Error scraping hotels: ${error.message}`)
  }

  return results
}

/**
 * Save results to JSON file
 */
function saveResults(results: ScrapedEntry[], outputFile: string) {
  const outputPath = path.resolve(outputFile)
  const dir = path.dirname(outputPath)

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Saved ${results.length} entries to: ${outputPath}`)
}

/**
 * Main scraper function
 */
async function scrape(options: ScraperOptions) {
  let browser: Browser | null = null

  try {
    browser = await initBrowser()
    const page = await setupPage(browser)

    let results: ScrapedEntry[] = []

    if (options.type === 'restaurants') {
      results = await scrapeRestaurants(
        page,
        options.city,
        options.maxPages || 5,
        options.delayMs || 3000
      )
    } else if (options.type === 'hotels') {
      results = await scrapeHotels(
        page,
        options.city,
        options.maxPages || 5,
        options.delayMs || 3000
      )
    }

    if (results.length > 0) {
      saveResults(results, options.outputFile)
    } else {
      console.log('\n⚠️  No results found. The Michelin Guide may have changed its structure.')
      console.log('   Consider using manual data collection or third-party APIs.')
    }

  } catch (error: any) {
    console.error('❌ Scraping failed:', error.message)
    process.exit(1)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScraperOptions {
  const args = process.argv.slice(2)
  const options: Partial<ScraperOptions> = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      options.type = args[i + 1] as 'restaurants' | 'hotels'
      i++
    } else if (args[i] === '--city' && args[i + 1]) {
      options.city = args[i + 1]
      i++
    } else if (args[i] === '--country' && args[i + 1]) {
      options.country = args[i + 1]
      i++
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputFile = args[i + 1]
      i++
    } else if (args[i] === '--max-pages' && args[i + 1]) {
      options.maxPages = parseInt(args[i + 1])
      i++
    } else if (args[i] === '--delay' && args[i + 1]) {
      options.delayMs = parseInt(args[i + 1])
      i++
    }
  }

  if (!options.type || !options.city || !options.outputFile) {
    console.error(`
❌ Missing required arguments

Usage: tsx scripts/scrape-michelin-guide.ts --type <restaurants|hotels> --city <city> --output <output-file>

Options:
  --type         Type of establishments to scrape (restaurants or hotels)
  --city         City name to search for
  --country      Country name (optional)
  --output       Output JSON file path
  --max-pages    Maximum number of pages to scrape (default: 5)
  --delay        Delay between requests in ms (default: 3000)

Examples:
  tsx scripts/scrape-michelin-guide.ts --type restaurants --city paris --output data/michelin/paris-restaurants.json
  tsx scripts/scrape-michelin-guide.ts --type hotels --city tokyo --output data/michelin/tokyo-hotels.json

Note: Run 'npx playwright install chromium' first if you haven't already.
    `)
    process.exit(1)
  }

  return options as ScraperOptions
}

/**
 * Main execution
 */
async function main() {
  console.log('🌟 Michelin Guide Web Scraper')
  console.log('================================\n')

  const options = parseArgs()

  console.log('Configuration:')
  console.log(`  Type:        ${options.type}`)
  console.log(`  City:        ${options.city}`)
  console.log(`  Output:      ${options.outputFile}`)
  console.log(`  Max Pages:   ${options.maxPages || 5}`)
  console.log(`  Delay:       ${options.delayMs || 3000}ms`)

  await scrape(options)

  console.log('\n✅ Scraping complete!')
  console.log('\nNext steps:')
  console.log(`1. Review the scraped data in: ${options.outputFile}`)
  console.log(`2. Import to database: tsx scripts/import-michelin-data.ts ${options.outputFile}`)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
