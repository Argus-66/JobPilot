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
    
    // Add dynamic answers if provided
    if (personalDetails.dynamicAnswers) {
      this.flatDetails.whyCompany = personalDetails.dynamicAnswers.whyCompany;
      this.flatDetails.companyName = personalDetails.dynamicAnswers.companyName;
    }
  }

  async fillForm() {
    try {
      logger.info('Starting form fill process...');
      
      // UPLOAD RESUME FIRST - so autofill features work
      await this.uploadResume();
      
      // Wait for autofill to potentially work
      await this.page.waitForTimeout(2000);
      logger.info('Waiting for any autofill to complete...');
      
      // Now fill remaining fields
      await this.fillTextInputs();
      
      // Fill textareas
      await this.fillTextareas();
      
      // Fill select dropdowns
      await this.fillSelects();
      
      // Handle checkboxes and radio buttons
      await this.handleCheckboxesAndRadios();
      
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
      await this.fillTextareaField(textarea);
    }
  }
  
  async fillTextareaField(element) {
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
      
      // Check if already filled
      const currentValue = await element.inputValue();
      if (currentValue && currentValue.trim() !== '') {
        return; // Skip already filled fields
      }
      
      // Try to match field
      const fieldIdentifier = [name, id, label, placeholder, ariaLabel]
        .filter(Boolean)
        .join(' ');
      
      const matchedKey = matchField(fieldIdentifier);
      
      // Special handling for company-specific questions
      const lowerIdentifier = fieldIdentifier.toLowerCase();
      if (lowerIdentifier.includes('what makes you') || 
          lowerIdentifier.includes('good fit') ||
          lowerIdentifier.includes('why do you want') ||
          lowerIdentifier.includes('why this company') ||
          lowerIdentifier.includes('why join')) {
        
        if (this.flatDetails.whyCompany) {
          await element.fill(this.flatDetails.whyCompany);
          this.filledFields.add('whyCompany');
          logger.success(`✓ Filled company-specific question`);
          return;
        }
      }
      
      if (matchedKey && this.flatDetails[matchedKey]) {
        const value = String(this.flatDetails[matchedKey]);
        await element.fill(value);
        this.filledFields.add(matchedKey);
        logger.success(`✓ Filled "${label || name || id}" with "${value.substring(0, 50)}..."`);
      }
    } catch (error) {
      // Silently continue - field might not be interactable
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
      
      // Check if already filled
      const currentValue = await element.inputValue();
      if (currentValue && currentValue.trim() !== '') {
        return; // Skip already filled fields
      }
      
      // Try to match field
      const fieldIdentifier = [name, id, label, placeholder, ariaLabel]
        .filter(Boolean)
        .join(' ');
      
      const lowerIdentifier = fieldIdentifier.toLowerCase();
      
      // Special handling for date fields
      if (lowerIdentifier.includes('start date') || lowerIdentifier.includes('expected start')) {
        const dateValue = this.flatDetails.expectedStartDate || this.flatDetails.startDate;
        if (dateValue) {
          await element.fill(dateValue);
          this.filledFields.add('expectedStartDate');
          logger.success(`✓ Filled start date: ${dateValue}`);
          return;
        }
      }
      
      const matchedKey = matchField(fieldIdentifier);
      
      if (matchedKey && this.flatDetails[matchedKey]) {
        const value = String(this.flatDetails[matchedKey]);
        
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
        
        const fieldIdentifier = [name, id, label].join(' ');
        const matchedKey = matchField(fieldIdentifier);
        
        // Special handling for 'How did you hear'
        if (fieldIdentifier.toLowerCase().includes('how did you hear') ||
            fieldIdentifier.toLowerCase().includes('how did you find')) {
          await this.selectOption(select, 'Job Board', name || id);
          continue;
        }
        
        if (matchedKey && this.flatDetails[matchedKey]) {
          const value = String(this.flatDetails[matchedKey]);
          await this.selectOption(select, value, name || id);
        }
      } catch (error) {
        // Continue on error
      }
    }
  }
  
  async selectOption(select, value, fieldName) {
    try {
      const options = await select.$$('option');
      const valueLower = value.toLowerCase();
      
      for (const option of options) {
        const optionText = (await option.textContent()).toLowerCase();
        const optionValue = (await option.getAttribute('value') || '').toLowerCase();
        
        if (optionText.includes(valueLower) || valueLower.includes(optionText) || optionValue === valueLower) {
          await select.selectOption({ label: await option.textContent() });
          logger.success(`✓ Selected "${await option.textContent()}" for "${fieldName}"`);
          return true;
        }
      }
    } catch (error) {
      logger.debug(`Could not select option for ${fieldName}`);
    }
    return false;
  }

  async handleCheckboxesAndRadios() {
    logger.info('Handling checkboxes and radio buttons...');
    
    // Handle work eligibility based on country/location
    await this.handleWorkEligibility();
    
    // Handle "Have you been employed before" questions
    await this.selectRadioByText(['Have you been employed by', 'previously worked at', 'worked here before'], 'No');
    
    // Handle consent/data retention checkboxes
    await this.checkBoxByText('I agree');
    await this.checkBoxByLabel(['allow', 'retain', 'candidate data', 'consent']);
    
    // Handle full-time internship availability
    await this.selectRadioByText(['Are you available for a full-time internship'], 'Yes');
    
    // Handle software engineering interests (checkboxes) - check all that apply
    await this.checkBoxByText('Backend Development');
    await this.checkBoxByText('Frontend Development');
    await this.checkBoxByText('Full-stack Development');
    // Optional: uncomment if you're interested in these
    // await this.checkBoxByText('DevOps/Cloud Engineering');
    
    // Handle education level (radio buttons)
    await this.selectRadioByText(['current level of education', 'education you are pursuing'], 'Undergrad');
    
    // Handle diversity survey questions
    await this.handleDiversitySurvey();
    
    // Handle ethnicity/race with fallback options
    await this.handleEthnicitySelection();
    
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
  
  async handleDiversitySurvey() {
    try {
      const pageText = await this.page.textContent('body');
      const lowerText = pageText.toLowerCase();
      
      // Handle age question
      if (lowerText.includes('current age') || lowerText.includes('age range')) {
        await this.selectRadioByText(['current age', 'age'], 'Under 30');
      }
      
      // Handle gender identity
      if (lowerText.includes('gender identity')) {
        await this.selectRadioByText(['gender identity'], 'Man');
      } else if (lowerText.includes('gender') && !lowerText.includes('transgender')) {
        await this.selectRadioByText(['gender', 'input gender'], 'Male');
      }
      
      // Handle transgender question
      if (lowerText.includes('transgender')) {
        await this.selectRadioByText(['identify as transgender', 'transgender'], 'No');
      }
      
      // Handle sexual orientation - checkbox version
      if (lowerText.includes('sexual orientation')) {
        await this.checkBoxByText('Heterosexual / straight');
        await this.checkBoxByText('Heterosexual');
      }
      
      // Handle communities/disability - checkbox version
      if (lowerText.includes('communities do you belong')) {
        await this.checkBoxByText('None of the above');
      }
      
      // Handle veteran status
      if (lowerText.includes('veteran status')) {
        await this.selectRadioByText(['veteran status', 'protected veteran'], 'I am not a protected veteran');
      }
      
    } catch (error) {
      logger.debug('Could not handle diversity survey');
    }
  }
  
  async handleWorkEligibility() {
    try {
      // Look for work eligibility questions
      const pageText = await this.page.textContent('body');
      const lowerText = pageText.toLowerCase();
      
      if (lowerText.includes('eligible to work in the country') || 
          lowerText.includes('authorized to work in') ||
          lowerText.includes('legal right to work')) {
        
        // Check if it's asking about India or international
        const isIndiaQuestion = lowerText.includes('india');
        const isInternational = !isIndiaQuestion && (lowerText.includes('country where you are applying') || 
                                                      lowerText.includes('romania') || 
                                                      lowerText.includes('united states') ||
                                                      lowerText.includes('this country'));
        
        if (isIndiaQuestion) {
          // Eligible to work in India - Yes
          await this.selectRadioByText(['eligible to work', 'authorized to work'], 'Yes');
        } else if (isInternational) {
          // Not eligible to work in other countries - No
          await this.selectRadioByText(['eligible to work', 'authorized to work'], 'No');
        }
      }
    } catch (error) {
      logger.debug('Could not handle work eligibility');
    }
  }
  
  async handleEthnicitySelection() {
    try {
      // Look for ethnicity/race questions
      const pageText = await this.page.textContent('body');
      const lowerText = pageText.toLowerCase();
      
      if (lowerText.includes('ethnicity') || lowerText.includes('race')) {
        // For checkbox-based ethnicity questions
        const hasCheckboxes = lowerText.includes('select all that apply');
        
        if (hasCheckboxes) {
          // Try checkbox options in order
          let checked = await this.checkBoxByText('Asian or Asian American');
          if (!checked) checked = await this.checkBoxByText('Asian (Not Hispanic or Latino)');
          if (!checked) checked = await this.checkBoxByText('Asian');
          return;
        }
        
        // For radio button ethnicity/race questions - try options in order
        let selected = await this.selectRadioByText(['ethnicity', 'race'], 'Asian (Not Hispanic or Latino)');
        
        if (!selected) {
          selected = await this.selectRadioByText(['ethnicity', 'race'], 'Asian or Asian American');
        }
        
        if (!selected) {
          selected = await this.selectRadioByText(['ethnicity', 'race'], 'Asian');
        }
        
        if (!selected) {
          // Fallback: Indian
          selected = await this.selectRadioByText(['ethnicity', 'race'], 'Indian');
        }
        
        if (!selected) {
          // Fallback: South Asian
          selected = await this.selectRadioByText(['ethnicity', 'race'], 'South Asian');
        }
        
        // Also try dropdown selects
        const selects = await this.page.$$('select');
        for (const select of selects) {
          const label = await this.getSelectLabel(select);
          if (label.toLowerCase().includes('ethnicity') || label.toLowerCase().includes('race')) {
            // Try in order: Asian options first, then fallbacks
            let success = await this.selectOption(select, 'Asian (Not Hispanic or Latino)', 'ethnicity');
            if (!success) success = await this.selectOption(select, 'Asian or Asian American', 'ethnicity');
            if (!success) success = await this.selectOption(select, 'Asian', 'ethnicity');
            if (!success) success = await this.selectOption(select, 'Indian', 'ethnicity');
            if (!success) await this.selectOption(select, 'South Asian', 'ethnicity');
            break;
          }
        }
      }
    } catch (error) {
      logger.debug('Could not handle ethnicity selection');
    }
  }
  
  async getSelectLabel(select) {
    try {
      const id = await select.getAttribute('id');
      if (id) {
        const labelElement = await this.page.$(`label[for="${id}"]`);
        if (labelElement) {
          return await labelElement.textContent();
        }
      }
    } catch (e) {}
    return '';
  }
  
  async checkBoxByText(targetText) {
    try {
      // Find checkbox by looking for label text that matches
      const labels = await this.page.$$('label');
      
      for (const label of labels) {
        const text = await label.textContent();
        
        if (text.trim() === targetText || text.trim().includes(targetText)) {
          // Try to find checkbox within or associated with this label
          const forAttr = await label.getAttribute('for');
          let checkbox = null;
          
          if (forAttr) {
            checkbox = await this.page.$(`#${forAttr}[type="checkbox"]`);
          } else {
            checkbox = await label.$('input[type="checkbox"]');
          }
          
          if (checkbox) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await checkbox.check();
              logger.success(`✓ Checked: ${targetText}`);
            }
            return true;
          }
        }
      }
      
      // Fallback: try to find by aria-label or nearby text
      const checkboxes = await this.page.$$('input[type="checkbox"]');
      for (const checkbox of checkboxes) {
        const ariaLabel = await checkbox.getAttribute('aria-label');
        const id = await checkbox.getAttribute('id');
        
        if ((ariaLabel && ariaLabel.includes(targetText)) || 
            (id && id.toLowerCase().includes(targetText.toLowerCase().replace(/[\s-]/g, '')))) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.check();
            logger.success(`✓ Checked: ${targetText}`);
          }
          return true;
        }
      }
    } catch (error) {
      logger.debug(`Could not check box for: ${targetText}`);
    }
    return false;
  }
  
  async selectRadioByText(questionKeywords, answerText) {
    try {
      // Find the question by looking for labels or text containing keywords
      const allText = await this.page.textContent('body');
      const lowerText = allText.toLowerCase();
      
      // Check if question exists on page
      const questionExists = questionKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
      if (!questionExists) return;
      
      // Find all radio buttons
      const radios = await this.page.$$('input[type=\"radio\"]');
      
      for (const radio of radios) {
        try {
          const id = await radio.getAttribute('id');
          const name = await radio.getAttribute('name');
          const value = await radio.getAttribute('value');
          
          // Get associated label
          let label = '';
          if (id) {
            const labelElement = await this.page.$(`label[for=\"${id}\"]`);
            if (labelElement) {
              label = await labelElement.textContent();
            }
          }
          
          // Check if this radio matches our answer
          const labelLower = label.toLowerCase();
          const answerLower = answerText.toLowerCase();
          
          if (labelLower.includes(answerLower) || answerLower.includes(labelLower) || 
              (value && value.toLowerCase().includes(answerLower))) {
            await radio.check();
            logger.success(`✓ Selected radio: ${label || value}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      // Continue on error
    }
    return false;
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
