import { chromium } from 'playwright';
import logger from '../utils/logger.js';

/**
 * Browser manager for Playwright automation
 */
class BrowserManager {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    try {
      logger.info('Launching browser...');
      
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: ['--start-maximized']
      });

      this.context = await this.browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Set default timeouts
      this.context.setDefaultTimeout(this.config.pageTimeout);
      this.context.setDefaultNavigationTimeout(this.config.navigationTimeout);

      this.page = await this.context.newPage();
      
      logger.success('Browser launched successfully');
      return this.page;
    } catch (error) {
      logger.error(`Failed to launch browser: ${error.message}`);
      throw error;
    }
  }

  async navigateTo(url) {
    try {
      logger.info(`Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      // Small delay instead of networkidle to avoid triggering refreshes
      await this.page.waitForTimeout(1500);
      return true;
    } catch (error) {
      logger.error(`Navigation failed: ${error.message}`);
      return false;
    }
  }

  async openInNewTab(url) {
    try {
      logger.info(`Opening new tab: ${url}`);
      const newPage = await this.context.newPage();
      await newPage.goto(url, { waitUntil: 'domcontentloaded' });
      // Small delay instead of networkidle to avoid refresh during CAPTCHA solving
      await newPage.waitForTimeout(1500);
      return newPage;
    } catch (error) {
      logger.error(`Failed to open new tab: ${error.message}`);
      throw error;
    }
  }

  async closeTab(page) {
    try {
      await page.close();
      logger.info('Tab closed');
    } catch (error) {
      logger.error(`Failed to close tab: ${error.message}`);
    }
  }

  async waitForSelector(selector, timeout = 5000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  async detectCaptcha() {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '[class*="captcha"]',
      '[id*="captcha"]',
      '.g-recaptcha',
      '#recaptcha'
    ];

    for (const selector of captchaSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        logger.warn('CAPTCHA detected on page');
        return true;
      }
    }
    
    return false;
  }

  getCurrentPage() {
    return this.page;
  }

  async getAllPages() {
    return this.context.pages();
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('Browser closed');
      }
    } catch (error) {
      logger.error(`Failed to close browser: ${error.message}`);
    }
  }
}

export default BrowserManager;
