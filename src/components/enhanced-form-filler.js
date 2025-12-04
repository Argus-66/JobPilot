import logger from '../utils/logger.js';
import { matchField, flattenPersonalDetails } from '../utils/field-matcher.js';
import userInput from '../utils/user-input.js';

/**
 * Enhanced form filler with support for complex form elements
 */
class EnhancedFormFiller {
  constructor(page, personalDetails, resumePath) {
    this.page = page;
    this.personalDetails = personalDetails;
    this.flatDetails = flattenPersonalDetails(personalDetails);
    this.resumePath = resumePath;
    this.filledFields = new Set();
  }

  async fillForm() {
    try {
      logger.info('Starting enhanced form fill process...');
      
      // Fill text inputs
      await this.fillTextInputs();
      
      // Fill textareas
      await this.fillTextareas();
      
      // Fill select dropdowns
      await this.fillSelects();
      
      // Handle date pickers
      await this.fillDateFields();
      
      // Handle checkboxes and radio buttons
      await this.handleCheckboxesAndRadios();
      
      // Handle custom dropdowns (div-based)
      await this.handleCustomDropdowns();
      
      // Upload resume
      await this.uploadResume();
      
      logger.success(`Form filling completed. Filled ${this.filledFields.size} fields.`);
      
      return true;
    } catch (error) {
      logger.error(`Form filling error: ${error.message}`);
      return false;
    }
  }

  async fillTextInputs() {
    const inputs = await this.page.$$('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type])');
    
    for (const input of inputs) {
      await this.fillInputField(input);
    }
  }

  async fillTextareas() {
    const textareas = await this.page.$$('textarea');
    
    for (const textarea of textareas) {
      await this.fillInputField(textarea);
    }
  }

  async fillInputField(element) {
    try {
      const name = await element.getAttribute('name') || '';
      const id = await element.getAttribute('id') || '';
      const placeholder = await element.getAttribute('placeholder') || '';
      const ariaLabel = await element.getAttribute('aria-label') || '';
      const type = await element.getAttribute('type') || '';
      
      // Skip date/number inputs - handle separately
      if (type === 'date' || type === 'number') {
        return;
      }
      
      // Get associated label
      let label = '';
      if (id) {
        const labelElement = await this.page.$(`label[for="${id}"]`);
        if (labelElement) {
          label = await labelElement.textContent();
        }
      }
      
      // Try to match field
      const fieldIdentifier = [name, id, label, placeholder, ariaLabel]
        .filter(Boolean)
        .join(' ');
      
      const matchedKey = matchField(fieldIdentifier);
      
      if (matchedKey && this.flatDetails[matchedKey]) {
        const value = String(this.flatDetails[matchedKey]);
        
        // Check if already filled
        const currentValue = await element.inputValue();
        if (currentValue && currentValue.trim() !== '') {
          return; // Skip already filled fields
        }
        
        await element.fill(value);
        this.filledFields.add(matchedKey);
        logger.debug(`Filled "${name || id || 'field'}" with "${value}"`);
      } else if (await element.getAttribute('required')) {
        // Handle required fields that we don't have data for
        const fieldLabel = label || placeholder || name || id;
        logger.warn(`Required field found without data: ${fieldLabel}`);
        
        const userValue = await userInput.askForMissingField(name || id, fieldLabel);
        if (userValue) {
          await element.fill(userValue);
          logger.success(`Manually filled: ${fieldLabel}`);
        }
      }
    } catch (error) {
      // Silently continue - field might not be interactable
    }
  }

  async fillDateFields() {
    try {
      // Handle date input fields
      const dateInputs = await this.page.$$('input[type="date"]');
      
      for (const dateInput of dateInputs) {
        const name = await dateInput.getAttribute('name') || '';
        const id = await dateInput.getAttribute('id') || '';
        
        // Check if it's a birth date field
        if (name.toLowerCase().includes('birth') || 
            name.toLowerCase().includes('dob') ||
            id.toLowerCase().includes('birth') ||
            id.toLowerCase().includes('dob')) {
          
          // Ask user for date of birth if not in details
          logger.warn('Date of birth field detected - needs manual input');
          const dob = await userInput.askForMissingField('dateOfBirth', 'Date of Birth (YYYY-MM-DD)');
          if (dob) {
            await dateInput.fill(dob);
            logger.success('Date of birth filled');
          }
        } else if (name.toLowerCase().includes('start') || name.toLowerCase().includes('available')) {
          // Try to fill start date if available
          const today = new Date().toISOString().split('T')[0];
          await dateInput.fill(today);
          logger.debug('Start date filled with today');
        }
      }

      // Handle month/year dropdowns (common in date of birth)
      await this.handleDateDropdowns();
    } catch (error) {
      logger.debug(`Date field handling: ${error.message}`);
    }
  }

  async handleDateDropdowns() {
    try {
      // Look for month/year/day dropdowns (common pattern)
      const selects = await this.page.$$('select');
      
      for (const select of selects) {
        const name = (await select.getAttribute('name') || '').toLowerCase();
        const id = (await select.getAttribute('id') || '').toLowerCase();
        
        if (name.includes('month') || id.includes('month') || 
            name.includes('day') || id.includes('day') ||
            name.includes('year') || id.includes('year')) {
          
          logger.warn(`Date dropdown detected: ${name || id} - requires manual selection`);
          // Pause for user to select
          await userInput.prompt(`Please select the date field: ${name || id}, then press Enter...`);
        }
      }
    } catch (error) {
      // Continue
    }
  }

  async fillSelects() {
    const selects = await this.page.$$('select');
    
    for (const select of selects) {
      try {
        const name = await select.getAttribute('name') || '';
        const id = await select.getAttribute('id') || '';
        
        // Get label
        let label = '';
        if (id) {
          const labelElement = await this.page.$(`label[for="${id}"]`);
          if (labelElement) {
            label = await labelElement.textContent();
          }
        }
        
        const matchedKey = matchField([name, id, label].join(' '));
        
        if (matchedKey && this.flatDetails[matchedKey]) {
          const value = String(this.flatDetails[matchedKey]).toLowerCase();
          
          // Try to find matching option
          const options = await select.$$('option');
          for (const option of options) {
            const optionText = (await option.textContent()).toLowerCase();
            const optionValue = (await option.getAttribute('value') || '').toLowerCase();
            
            if (optionText.includes(value) || value.includes(optionText) || optionValue === value) {
              await select.selectOption({ label: await option.textContent() });
              this.filledFields.add(matchedKey);
              logger.debug(`Selected "${await option.textContent()}" for "${name || id}"`);
              break;
            }
          }
        }
      } catch (error) {
        // Continue on error
      }
    }
  }

  async handleCustomDropdowns() {
    try {
      // Handle custom dropdowns (div/button based)
      const customDropdowns = await this.page.$$('[role="combobox"], [role="listbox"], .dropdown, [class*="select"]');
      
      for (const dropdown of customDropdowns) {
        try {
          const ariaLabel = await dropdown.getAttribute('aria-label') || '';
          const className = await dropdown.getAttribute('class') || '';
          
          if (ariaLabel || className) {
            logger.debug(`Found custom dropdown: ${ariaLabel || className}`);
            // These typically require clicking and selecting
            // Will need manual intervention for complex ones
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      // Continue
    }
  }

  async handleCheckboxesAndRadios() {
    // Handle work authorization checkboxes
    if (this.flatDetails.authorized) {
      await this.checkBoxByLabel(['authorized to work', 'legally authorized', 'right to work']);
    }
    
    // Handle sponsorship
    if (this.flatDetails.requiresSponsorship === false) {
      await this.checkBoxByLabel(['do not require sponsorship', 'no sponsorship']);
    } else if (this.flatDetails.requiresSponsorship === true) {
      await this.checkBoxByLabel(['require sponsorship', 'need sponsorship']);
    }

    // Handle gender radio buttons
    if (this.flatDetails.gender) {
      await this.selectRadioByValue(this.flatDetails.gender.toLowerCase());
    }
  }

  async checkBoxByLabel(keywords) {
    try {
      const labels = await this.page.$$('label');
      
      for (const label of labels) {
        const text = (await label.textContent()).toLowerCase();
        
        if (keywords.some(keyword => text.includes(keyword))) {
          const checkbox = await label.$('input[type="checkbox"]');
          if (checkbox) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await checkbox.check();
              logger.debug(`Checked: ${text.substring(0, 40)}`);
            }
          }
        }
      }
    } catch (error) {
      // Continue on error
    }
  }

  async selectRadioByValue(value) {
    try {
      const radios = await this.page.$$('input[type="radio"]');
      
      for (const radio of radios) {
        const radioValue = (await radio.getAttribute('value') || '').toLowerCase();
        const radioId = (await radio.getAttribute('id') || '').toLowerCase();
        
        if (radioValue === value || radioId.includes(value)) {
          await radio.check();
          logger.debug(`Selected radio: ${value}`);
          break;
        }
      }
    } catch (error) {
      // Continue
    }
  }

  async uploadResume() {
    try {
      const fileInputs = await this.page.$$('input[type="file"]');
      
      for (const fileInput of fileInputs) {
        const name = await fileInput.getAttribute('name') || '';
        const id = await fileInput.getAttribute('id') || '';
        const accept = await fileInput.getAttribute('accept') || '';
        
        // Check if this is for resume/CV
        if (name.toLowerCase().includes('resume') || 
            name.toLowerCase().includes('cv') ||
            id.toLowerCase().includes('resume') ||
            id.toLowerCase().includes('cv') ||
            accept.includes('pdf')) {
          
          await fileInput.setInputFiles(this.resumePath);
          logger.success('Resume uploaded');
          return;
        }
      }
      
      // If no specific resume input found, try first file input
      if (fileInputs.length > 0) {
        await fileInputs[0].setInputFiles(this.resumePath);
        logger.success('Resume uploaded to file input');
      }
    } catch (error) {
      logger.warn(`Could not upload resume: ${error.message}`);
    }
  }

  async detectSubmitButton() {
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send")',
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'a:has-text("Submit")',
      'a:has-text("Apply")'
    ];

    for (const selector of submitSelectors) {
      const button = await this.page.$(selector);
      if (button && await button.isVisible()) {
        return button;
      }
    }
    
    return null;
  }
}

export default EnhancedFormFiller;
