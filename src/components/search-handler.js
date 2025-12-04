import logger from '../utils/logger.js';

/**
 * Google search handler to find job postings
 */
class SearchHandler {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  async performSearch(searchQuery) {
    try {
      const page = this.browserManager.getCurrentPage();
      
      // Navigate to Google
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      await this.browserManager.navigateTo(googleUrl);
      
      logger.info(`Searching: ${searchQuery}`);
      
      // Handle Google consent page if it appears
      try {
        const acceptButton = await page.$('button:has-text("Accept all")', { timeout: 3000 });
        if (acceptButton) {
          await acceptButton.click();
          logger.info('Accepted Google consent');
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // No consent page, continue
      }
      
      // Check for CAPTCHA and wait for user to solve it
      let captchaDetected = true;
      while (captchaDetected) {
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        // Check if we're on a CAPTCHA page
        if (currentUrl.includes('/sorry/') || 
            pageContent.includes('unusual traffic') ||
            pageContent.includes('not a robot') ||
            pageContent.includes('CAPTCHA')) {
          logger.warn('🤖 CAPTCHA DETECTED - Please solve the CAPTCHA in the browser');
          logger.warn('⏳ Waiting for you to complete it... (no timeout)');
          
          // Wait for user to solve CAPTCHA - no timeout!
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              const text = document.body.textContent;
              return !url.includes('/sorry/') && 
                     !text.includes('unusual traffic') &&
                     !text.includes('not a robot');
            },
            { timeout: 0 } // No timeout - wait forever
          );
          
          logger.success('✓ CAPTCHA solved! Continuing...');
          await page.waitForTimeout(2000);
        }
        
        captchaDetected = false;
      }
      
      // Wait for results to load - try multiple selectors
      const loaded = await Promise.race([
        page.waitForSelector('#search', { timeout: 8000 }).then(() => true).catch(() => false),
        page.waitForSelector('#rso', { timeout: 8000 }).then(() => true).catch(() => false),
        page.waitForSelector('[data-sokoban-container]', { timeout: 8000 }).then(() => true).catch(() => false)
      ]);
      
      if (!loaded) {
        logger.warn('⚠ Search results took longer to load, continuing anyway...');
      }
      
      // Give it a moment to fully load
      await page.waitForTimeout(2000);
      
      return true;
    } catch (error) {
      logger.error(`Search failed: ${error.message}`);
      return false;
    }
  }

  async extractJobLinks(maxResults = 10) {
    try {
      const page = this.browserManager.getCurrentPage();
      
      // Extract search result links - try multiple selectors
      let links = [];
      
      try {
        links = await page.$$eval('div#search a[href], div#rso a[href], [data-sokoban-container] a[href]', (elements, platforms) => {
          return elements
            .map(el => {
              const href = el.href;
              const title = el.textContent.trim();
              
              // Check if link is from target platforms
              const isTargetPlatform = platforms.some(platform => href.includes(platform));
              
              if (isTargetPlatform && href && title && title.length > 10) {
                return { url: href, title };
              }
              return null;
            })
            .filter(link => link !== null);
        }, ['jobs.greenhouse.io', 'jobs.lever.co', 'jobs.ashbyhq.com']);
      } catch (error) {
        logger.warn(`Could not extract with eval, trying manual approach: ${error.message}`);
        
        // Fallback: manual extraction
        const allLinks = await page.$$('a[href]');
        for (const link of allLinks) {
          try {
            const href = await link.getAttribute('href');
            const text = await link.textContent();
            
            if (href && (href.includes('jobs.greenhouse.io') || 
                        href.includes('jobs.lever.co') || 
                        href.includes('jobs.ashbyhq.com'))) {
              links.push({ url: href, title: text.trim() });
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Remove duplicates
      const uniqueLinks = Array.from(
        new Map(links.map(link => [link.url, link])).values()
      );
      
      const limitedLinks = uniqueLinks.slice(0, maxResults);
      
      logger.success(`Found ${limitedLinks.length} job posting(s)`);
      limitedLinks.forEach((link, index) => {
        logger.info(`  ${index + 1}. ${link.title.substring(0, 60)}...`);
      });
      
      return limitedLinks;
    } catch (error) {
      logger.error(`Failed to extract links: ${error.message}`);
      return [];
    }
  }

  async searchAndExtract(searchQuery, maxResults = 10) {
    const success = await this.performSearch(searchQuery);
    
    if (!success) {
      return [];
    }
    
    // Small delay to ensure results are loaded
    await this.browserManager.getCurrentPage().waitForTimeout(2000);
    
    return await this.extractJobLinks(maxResults);
  }
}

export default SearchHandler;
