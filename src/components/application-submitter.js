import logger from '../utils/logger.js';
import userInput from '../utils/user-input.js';
import FormFiller from './form-filler.js';
import JobAnalyzer from './job-analyzer.js';

/**
 * Application submitter - handles the job application flow
 */
class ApplicationSubmitter {
  constructor(browserManager, personalDetails, resumePath, config) {
    this.browserManager = browserManager;
    this.personalDetails = personalDetails;
    this.resumePath = resumePath;
    this.config = config;
    this.jobAnalyzer = new JobAnalyzer(personalDetails);
  }

  async applyToJob(jobLink) {
    let jobPage = null;
    
    try {
      logger.separator();
      logger.info(`Processing: ${jobLink.title}`);
      logger.info(`URL: ${jobLink.url}`);
      
      // Open job in new tab
      jobPage = await this.browserManager.openInNewTab(jobLink.url);
      
      // Wait for page to load
      await jobPage.waitForLoadState('domcontentloaded');
      await jobPage.waitForTimeout(2000);
      
      // ANALYZE JOB OVERVIEW FIRST
      logger.info('Analyzing job description...');
      const analysis = await this.jobAnalyzer.analyzeJobOverview(jobPage);
      
      if (!analysis.suitable) {
        logger.warn(`❌ Skipping job: ${analysis.reason}`);
        return false;
      }
      
      logger.success('✓ Job is suitable - proceeding with application');
      
      // Extract job info
      const jobInfo = analysis.jobInfo;
      logger.info(`Company: ${jobInfo.company || 'Unknown'}`);
      logger.info(`Position: ${jobInfo.title || 'Unknown'}`);
      logger.info(`Location: ${jobInfo.location || 'Unknown'}`);
      
      // CRITICAL: Filter by location for non-remote international jobs
      if (await this.shouldSkipJob(jobInfo, jobPage)) {
        logger.warn('⚠️  Skipping job - not suitable based on location/type requirements');
        return false;
      }
      
      // Look for apply button
      const applyButton = await this.findApplyButton(jobPage);
      
      if (applyButton) {
        logger.success('Apply button found');
        await applyButton.click();
        await jobPage.waitForTimeout(2000);
        
        // Check for CAPTCHA
        if (await this.browserManager.detectCaptcha()) {
          await userInput.waitForCaptcha();
        }
        
        // Fill the application form with dynamic answers
        await this.fillApplicationForm(jobPage, analysis);
        
        // Handle submission based on auto-submit setting
        if (this.config.autoSubmit) {
          // Auto-submit mode - just submit directly
          logger.warn('🤖 AUTO-SUBMIT MODE - Submitting automatically...');
          await this.submitApplication(jobPage);
          logger.success('✓ Application auto-submitted!');
        } else {
          // Manual mode - ask for confirmation
          const shouldSubmit = await userInput.confirmSubmission(jobInfo.title, jobInfo.company);
          
          if (shouldSubmit) {
            await this.submitApplication(jobPage);
            logger.success('✓ Application submitted successfully!');
          } else {
            logger.info('Application submission skipped by user');
          }
        }
      } else {
        logger.warn('Could not find apply button on this page');
      }
      
      return true;
    } catch (error) {
      logger.error(`Application error: ${error.message}`);
      return false;
    } finally {
      // Close the job tab
      if (jobPage) {
        await jobPage.waitForTimeout(2000);
        await this.browserManager.closeTab(jobPage);
      }
    }
  }

  async extractJobInfo(page) {
    try {
      const title = await page.title();
      
      // Try to extract company name from common selectors
      let company = null;
      const companySelectors = [
        '[class*="company"]',
        '[class*="employer"]',
        '[data-test="company-name"]',
        'h2', 'h3'
      ];
      
      for (const selector of companySelectors) {
        const element = await page.$(selector);
        if (element) {
          company = await element.textContent();
          if (company) break;
        }
      }
      
      // Try to extract location
      let location = null;
      const locationSelectors = [
        '[class*="location"]',
        '[data-test="location"]',
        '[class*="office"]'
      ];
      
      for (const selector of locationSelectors) {
        const element = await page.$(selector);
        if (element) {
          location = await element.textContent();
          if (location) break;
        }
      }
      
      return {
        title: title || 'Unknown Position',
        company: company?.trim() || null,
        location: location?.trim() || null
      };
    } catch (error) {
      return { title: 'Unknown Position', company: null, location: null };
    }
  }

  async findApplyButton(page) {
    const applySelectors = [
      'a:has-text("Apply for this job")',
      'button:has-text("Apply for this job")',
      'a:has-text("Apply Now")',
      'button:has-text("Apply Now")',
      'a:has-text("Apply")',
      'button:has-text("Apply")',
      '[class*="apply"]',
      '[id*="apply"]'
    ];

    for (const selector of applySelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          return button;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  async fillApplicationForm(page, analysis) {
    logger.info('Filling application form...');
    
    // Wait for form to appear
    await page.waitForTimeout(2000);
    
    // Create enhanced personal details with dynamic answers
    const enhancedDetails = {
      ...this.personalDetails,
      dynamicAnswers: {
        whyCompany: analysis.whyWorkHere,
        companyName: analysis.jobInfo.company
      }
    };
    
    const formFiller = new FormFiller(page, enhancedDetails, this.resumePath);
    await formFiller.fillForm();
    
    // Check for CAPTCHA again after filling
    if (await this.browserManager.detectCaptcha()) {
      await userInput.waitForCaptcha();
    }
  }

  async submitApplication(page) {
    // This is a placeholder - actual submission is manual for safety
    logger.info('Please review the form and submit manually');
    await userInput.prompt('Press Enter once you have submitted the application...');
  }

  async shouldSkipJob(jobInfo, page) {
    try {
      const pageText = await page.textContent('body');
      const lowerText = pageText.toLowerCase();
      const location = (jobInfo.location || '').toLowerCase();
      
      // List of countries/regions outside India
      const internationalLocations = [
        'usa', 'united states', 'us', 'america', 'san francisco', 'new york', 'california',
        'uk', 'united kingdom', 'london', 'europe', 'canada', 'toronto', 'vancouver',
        'australia', 'singapore', 'germany', 'france', 'netherlands'
      ];
      
      // Check if location is international
      const isInternational = internationalLocations.some(loc => 
        location.includes(loc) || lowerText.includes(`location: ${loc}`) || lowerText.includes(`office: ${loc}`)
      );
      
      // If international, check if it's remote
      if (isInternational) {
        const isRemote = lowerText.includes('remote') || 
                        lowerText.includes('work from home') || 
                        lowerText.includes('anywhere');
        
        const isHybrid = lowerText.includes('hybrid');
        const isOnsite = lowerText.includes('on-site') || lowerText.includes('onsite') || lowerText.includes('in-office');
        
        if (isHybrid || isOnsite) {
          logger.warn(`International ${isHybrid ? 'Hybrid' : 'Onsite'} position - You're in India, can't relocate without sponsorship`);
          return true; // Skip this job
        }
        
        if (!isRemote) {
          logger.warn('International position with unclear remote status - asking for confirmation');
          const shouldApply = await userInput.prompt('This appears to be an international position. Continue? (yes/no): ');
          return shouldApply.toLowerCase() !== 'yes' && shouldApply.toLowerCase() !== 'y';
        }
      }
      
      return false; // Don't skip
    } catch (error) {
      logger.warn('Could not determine location restrictions, continuing...');
      return false;
    }
  }
}

export default ApplicationSubmitter;
