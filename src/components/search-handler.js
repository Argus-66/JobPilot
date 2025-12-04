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
      
      // Wait for results to load
      await page.waitForSelector('#search', { timeout: 10000 });
      
      return true;
    } catch (error) {
      logger.error(`Search failed: ${error.message}`);
      return false;
    }
  }

  async extractJobLinks(maxResults = 10) {
    try {
      const page = this.browserManager.getCurrentPage();
      
      // Extract search result links
      const links = await page.$$eval('div#search a[href]', (elements, platforms) => {
        return elements
          .map(el => {
            const href = el.href;
            const title = el.textContent.trim();
            
            // Check if link is from target platforms
            const isTargetPlatform = platforms.some(platform => href.includes(platform));
            
            if (isTargetPlatform && href && title) {
              return { url: href, title };
            }
            return null;
          })
          .filter(link => link !== null);
      }, ['jobs.greenhouse.io', 'jobs.lever.co', 'jobs.ashbyhq.com']);
      
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
