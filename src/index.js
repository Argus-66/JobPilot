import logger from './utils/logger.js';
import configLoader from './utils/config-loader.js';
import userInput from './utils/user-input.js';
import BrowserManager from './components/browser-manager.js';
import SearchHandler from './components/search-handler.js';
import ApplicationSubmitter from './components/application-submitter.js';

/**
 * Main automation orchestrator
 */
class JobSearchAutomation {
  constructor() {
    this.config = null;
    this.browserManager = null;
    this.searchHandler = null;
    this.applicationSubmitter = null;
    this.personalDetails = null;
    this.resumePath = null;
    this.searchQueries = [];
  }

  async initialize() {
    try {
      logger.separator();
      logger.info('Job Search Automation - Initializing...');
      logger.separator();
      
      // Load environment configuration
      const env = configLoader.loadEnv();
      this.config = {
        headless: configLoader.parseBoolean(env.HEADLESS),
        slowMo: configLoader.parseInt(env.SLOW_MO),
        pageTimeout: configLoader.parseInt(env.PAGE_TIMEOUT),
        navigationTimeout: configLoader.parseInt(env.NAVIGATION_TIMEOUT),
        maxApplications: configLoader.parseInt(env.MAX_APPLICATIONS_PER_RUN),
        autoSubmit: configLoader.parseBoolean(env.AUTO_SUBMIT)
      };
      
      logger.info(`Configuration loaded:`);
      logger.info(`  - Headless mode: ${this.config.headless}`);
      logger.info(`  - Auto-submit: ${this.config.autoSubmit}`);
      logger.info(`  - Max applications: ${this.config.maxApplications}`);
      
      // Load search queries
      this.searchQueries = configLoader.loadSearchQueries();
      logger.info(`Loaded ${this.searchQueries.length} search query(ies)`);
      
      // Load personal details
      this.personalDetails = configLoader.loadPersonalDetails();
      logger.success('Personal details loaded');
      
      // Get resume path
      this.resumePath = configLoader.getResumePath();
      logger.success('Resume found');
      
      // Initialize browser
      this.browserManager = new BrowserManager(this.config);
      await this.browserManager.launch();
      
      // Initialize components
      this.searchHandler = new SearchHandler(this.browserManager);
      this.applicationSubmitter = new ApplicationSubmitter(
        this.browserManager,
        this.personalDetails,
        this.resumePath,
        this.config
      );
      
      logger.success('Initialization complete!');
      logger.separator();
      
      // Ask user about auto-submit preference
      const autoSubmitResponse = await userInput.prompt('\n🤖 AUTO-SUBMIT MODE: Should I automatically submit applications without waiting for your review?\n   - YES: Auto-submit all (only stops for CAPTCHAs)\n   - NO: You review and submit each one manually\n\nYour choice (yes/no): ');
      
      this.config.autoSubmit = autoSubmitResponse.toLowerCase() === 'yes' || autoSubmitResponse.toLowerCase() === 'y';
      
      if (this.config.autoSubmit) {
        logger.warn('⚠️  AUTO-SUBMIT ENABLED - Applications will be submitted automatically!');
        logger.warn('⚠️  Make sure your details are correct!');
      } else {
        logger.info('✓ Manual review mode - You will review each application before submission');
      }
      
      logger.separator();
      
      return true;
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      return false;
    }
  }

  async run() {
    try {
      let totalApplications = 0;
      
      // Process each search query
      for (let i = 0; i < this.searchQueries.length; i++) {
        const query = this.searchQueries[i];
        
        logger.separator();
        logger.info(`Query ${i + 1}/${this.searchQueries.length}: ${query.name}`);
        logger.info(`Search: ${query.query}`);
        logger.separator();
        
        // Perform search and extract job links
        const jobLinks = await this.searchHandler.searchAndExtract(
          query.query,
          this.config.maxApplications
        );
        
        if (jobLinks.length === 0) {
          logger.warn('⚠ No job links found for this query');
          
          // Ask if user wants to continue to next query
          if (i < this.searchQueries.length - 1) {
            const shouldContinue = await userInput.prompt('\nNo jobs found. Continue to next search query? (yes/no): ');
            if (shouldContinue.toLowerCase() !== 'yes' && shouldContinue.toLowerCase() !== 'y') {
              logger.info('User chose to stop');
              break;
            }
          }
          continue;
        }
        
        // Process each job link
        for (let j = 0; j < jobLinks.length; j++) {
          if (totalApplications >= this.config.maxApplications) {
            logger.warn(`Reached max applications limit (${this.config.maxApplications})`);
            break;
          }
          
          logger.info(`\nProcessing job ${j + 1}/${jobLinks.length}`);
          
          const success = await this.applicationSubmitter.applyToJob(jobLinks[j]);
          
          if (success) {
            totalApplications++;
          }
        }
        
        // Check if we should continue to next query
        if (i < this.searchQueries.length - 1) {
          const shouldContinue = await userInput.prompt('\nContinue to next search query? (yes/no): ');
          if (shouldContinue.toLowerCase() !== 'yes' && shouldContinue.toLowerCase() !== 'y') {
            logger.info('User chose to stop');
            break;
          }
        }
      }
      
      logger.separator();
      logger.success(`Automation completed!`);
      logger.info(`Total applications processed: ${totalApplications}`);
      logger.separator();
      
    } catch (error) {
      logger.error(`Runtime error: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    try {
      logger.info('Cleaning up...');
      
      if (this.browserManager) {
        await this.browserManager.close();
      }
      
      userInput.close();
      
      logger.success('Cleanup complete');
    } catch (error) {
      logger.error(`Cleanup error: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const automation = new JobSearchAutomation();
  
  try {
    const initialized = await automation.initialize();
    
    if (!initialized) {
      process.exit(1);
    }
    
    await automation.run();
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
  } finally {
    await automation.cleanup();
  }
}

// Run the automation
main().catch(console.error);
