import readline from 'readline';

/**
 * User input handler for manual interventions
 */
class UserInput {
  constructor() {
    this.rl = null;
  }

  createInterface() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  async prompt(question) {
    const rl = this.createInterface();
    
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async waitForCaptcha() {
    console.log('\n⚠️  CAPTCHA detected! Please solve it manually in the browser.');
    await this.prompt('Press Enter once you have solved the CAPTCHA...');
    console.log('✓ Continuing automation...\n');
  }

  async askForMissingField(fieldName, fieldLabel) {
    console.log(`\n⚠️  Field not found in personal details: ${fieldLabel || fieldName}`);
    const answer = await this.prompt(`Please enter value for "${fieldLabel || fieldName}": `);
    return answer;
  }

  async confirmSubmission(jobTitle, company) {
    console.log(`\n📋 Ready to submit application:`);
    console.log(`   Job: ${jobTitle}`);
    console.log(`   Company: ${company || 'Unknown'}`);
    const answer = await this.prompt('Submit this application? (yes/no): ');
    return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
  }

  async continueToNextJob() {
    const answer = await this.prompt('\nContinue to next job? (yes/no): ');
    return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
  }

  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

export default new UserInput();
