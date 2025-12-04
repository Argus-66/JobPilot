import logger from '../utils/logger.js';
import userInput from '../utils/user-input.js';
import FormFiller from './form-filler.js';

/**
 * Application submitter - handles the job application flow
 */
class ApplicationSubmitter {
  constructor(browserManager, personalDetails, resumePath, config) {
    this.browserManager = browserManager;
    this.personalDetails = personalDetails;
    this.resumePath = resumePath;
    this.config = config;
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
      
      // Extract job info
      const jobInfo = await this.extractJobInfo(jobPage);
      logger.info(`Company: ${jobInfo.company || 'Unknown'}`);
      logger.info(`Position: ${jobInfo.title || 'Unknown'}`);
      
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
        
        // Fill the application form
        await this.fillApplicationForm(jobPage);
        
        // Ask for confirmation before submitting
        if (this.config.autoSubmit) {
          logger.warn('Auto-submit is enabled - review the form manually');
        }
        
        const shouldSubmit = await userInput.confirmSubmission(jobInfo.title, jobInfo.company);
        
        if (shouldSubmit) {
          await this.submitApplication(jobPage);
          logger.success('✓ Application submitted successfully!');
        } else {
          logger.info('Application submission skipped by user');
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
      
      return {
        title: title || 'Unknown Position',
        company: company?.trim() || null
      };
    } catch (error) {
      return { title: 'Unknown Position', company: null };
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

  async fillApplicationForm(page) {
    logger.info('Filling application form...');
    
    // Wait for form to appear
    await page.waitForTimeout(2000);
    
    const formFiller = new FormFiller(page, this.personalDetails, this.resumePath);
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
}

export default ApplicationSubmitter;
