import logger from '../utils/logger.js';
import { matchField, flattenPersonalDetails } from '../utils/field-matcher.js';
import userInput from '../utils/user-input.js';

/**
 * Form filler component to auto-fill job application forms
 */
class FormFiller {
  constructor(page, personalDetails, resumePath) {
    this.page = page;
    this.personalDetails = personalDetails;
    this.flatDetails = flattenPersonalDetails(personalDetails);
    this.resumePath = resumePath;
    this.filledFields = new Set();
  }

  async fillForm() {
    try {
      logger.info('Starting form fill process...');
      
      // Fill text inputs
      await this.fillTextInputs();
      
      // Fill textareas
      await this.fillTextareas();
      
      // Fill select dropdowns
      await this.fillSelects();
      
      // Handle checkboxes and radio buttons
      await this.handleCheckboxesAndRadios();
      
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
    const inputs = await this.page.$$('input[type="text"], input[type="email"], input[type="tel"], input:not([type])');
    
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

  async uploadResume() {
    try {
      const fileInputs = await this.page.$$('input[type="file"]');
      
      for (const fileInput of fileInputs) {
        const name = await fileInput.getAttribute('name') || '';
        const id = await fileInput.getAttribute('id') || '';
        
        // Check if this is for resume/CV
        if (name.toLowerCase().includes('resume') || 
            name.toLowerCase().includes('cv') ||
            id.toLowerCase().includes('resume') ||
            id.toLowerCase().includes('cv')) {
          
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

export default FormFiller;
