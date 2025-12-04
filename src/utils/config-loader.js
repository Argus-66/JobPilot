import fs from 'fs';
import path from 'path';

/**
 * Configuration loader and validator
 */
class ConfigLoader {
  constructor() {
    this.rootDir = path.resolve('.');
  }

  loadJSON(filePath) {
    try {
      const fullPath = path.resolve(filePath);
      const data = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
  }

  loadSearchQueries() {
    const queries = this.loadJSON('config/search-queries.json');
    return queries.queries.filter(q => q.enabled);
  }

  loadPersonalDetails() {
    const personalDetailsPath = path.resolve('data/personal-details.json');
    
    if (!fs.existsSync(personalDetailsPath)) {
      throw new Error(
        'personal-details.json not found! Please create it in the data/ folder using personal-details.example.json as a template.'
      );
    }
    
    return this.loadJSON('data/personal-details.json');
  }

  getResumePath() {
    const resumePath = path.resolve('data/resume.pdf');
    
    if (!fs.existsSync(resumePath)) {
      throw new Error('resume.pdf not found! Please place your resume in the data/ folder.');
    }
    
    return resumePath;
  }

  loadEnv() {
    const envPath = path.resolve('.env');
    
    if (!fs.existsSync(envPath)) {
      return this.getDefaultEnv();
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return { ...this.getDefaultEnv(), ...env };
  }

  getDefaultEnv() {
    return {
      HEADLESS: 'false',
      SLOW_MO: '100',
      PAGE_TIMEOUT: '30000',
      NAVIGATION_TIMEOUT: '30000',
      MAX_APPLICATIONS_PER_RUN: '10',
      AUTO_SUBMIT: 'false'
    };
  }

  parseBoolean(value) {
    return value === 'true' || value === true;
  }

  parseInt(value) {
    return parseInt(value, 10);
  }
}

export default new ConfigLoader();
