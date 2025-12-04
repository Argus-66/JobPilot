import logger from '../utils/logger.js';

/**
 * Job analyzer - reads job description and determines suitability
 */
class JobAnalyzer {
  constructor(personalDetails) {
    this.personalDetails = personalDetails;
  }

  /**
   * Analyze job overview to determine if it's suitable
   */
  async analyzeJobOverview(page) {
    try {
      // Get all text from the page
      const pageText = await page.textContent('body');
      const lowerText = pageText.toLowerCase();
      
      // Extract job details
      const jobInfo = this.extractJobDetails(pageText, lowerText);
      
      // Check location requirements
      const locationCheck = this.checkLocationRequirements(jobInfo, lowerText);
      if (!locationCheck.suitable) {
        return {
          suitable: false,
          reason: locationCheck.reason,
          jobInfo
        };
      }
      
      // Check work authorization requirements
      const authCheck = this.checkWorkAuthorization(lowerText);
      if (!authCheck.suitable) {
        return {
          suitable: false,
          reason: authCheck.reason,
          jobInfo
        };
      }
      
      // Check if it's an internship
      const isInternship = this.checkPositionType(jobInfo, lowerText);
      if (!isInternship) {
        return {
          suitable: false,
          reason: 'Not an internship position',
          jobInfo
        };
      }
      
      return {
        suitable: true,
        jobInfo,
        whyWorkHere: this.generateWhyWorkHere(jobInfo, pageText)
      };
    } catch (error) {
      logger.error(`Job analysis error: ${error.message}`);
      return { suitable: true, jobInfo: {} }; // Default to suitable if analysis fails
    }
  }

  extractJobDetails(pageText, lowerText) {
    // Extract company name
    const companyMatch = pageText.match(/([A-Z][a-zA-Z0-9\s&]+)(?:\s+is|\s+helps|\s+provides)/);
    const company = companyMatch ? companyMatch[1].trim() : null;
    
    // Extract location
    const locationPatterns = [
      /location[:\s]+([^.\n]+)/i,
      /office[s]?[:\s]+([^.\n]+)/i,
      /(san francisco|new york|ny|sf|california|india|remote|hybrid)/i
    ];
    
    let location = null;
    for (const pattern of locationPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        location = match[1] || match[0];
        break;
      }
    }
    
    // Extract role type
    const roleMatch = pageText.match(/(software|frontend|backend|full[- ]?stack|engineer|developer)/i);
    const role = roleMatch ? roleMatch[0] : 'Software';
    
    return { company, location, role };
  }

  checkLocationRequirements(jobInfo, lowerText) {
    const location = (jobInfo.location || '').toLowerCase();
    
    // Check for full-time positions (not internships)
    const isFullTime = lowerText.includes('full time') || lowerText.includes('full-time') || lowerText.includes('employment type: full time');
    const isOnSite = lowerText.includes('on-site') || lowerText.includes('on site') || lowerText.includes('location type: on-site');
    
    // Reject full-time on-site positions outside India
    const indiaLocations = ['india', 'pune', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai'];
    const isIndiaLocation = indiaLocations.some(loc => location.includes(loc) || lowerText.includes(loc));
    
    if (isFullTime && isOnSite && !isIndiaLocation) {
      return {
        suitable: false,
        reason: 'Full-time on-site position outside India - You are based in India and need remote work for international positions'
      };
    }
    
    // Check for hybrid/in-office requirements with specific day counts
    const officeRequirements = [
      /available to work in our (.*?) office (\d+).?(\d+)? days? (a|per) week/i,
      /work (?:from|in|at) our (.*?) office (\d+).?(\d+)? days?/i,
      /(\d+).?(\d+)? days? (?:a|per) week in (?:the|our) (.*?) office/i,
      /in.office (\d+).?(\d+)? days?/i
    ];
    
    for (const pattern of officeRequirements) {
      const match = lowerText.match(pattern);
      if (match) {
        // Extract location from match
        const officeLocation = match[1] || match[3] || '';
        const usLocations = ['new york', 'nyc', 'san francisco', 'sf', 'california', 'boston', 'seattle', 'austin'];
        
        if (usLocations.some(loc => officeLocation.includes(loc) || lowerText.includes(`office in ${loc}`))) {
          return {
            suitable: false,
            reason: `Requires in-office presence in ${officeLocation || 'US location'} - You are in India and cannot attend in person`
          };
        }
      }
    }
    
    // Check for explicit hybrid/onsite requirements in US/international locations
    const requiresInPerson = lowerText.includes('in-person') || 
                            lowerText.includes('work from our offices') ||
                            lowerText.includes('anchor days') ||
                            lowerText.includes('come to the office') ||
                            lowerText.includes('work out of our');
    
    const usLocations = ['san francisco', 'new york', 'california', 'ny', 'sf', 'usa', 'united states', 'bucharest', 'romania', 'europe'];
    const isUSLocation = usLocations.some(loc => location.includes(loc) || lowerText.includes(loc));
    
    if (requiresInPerson && isUSLocation) {
      return {
        suitable: false,
        reason: 'Requires in-person work in international office - You are in India and cannot relocate without sponsorship'
      };
    }
    
    // Check for explicit relocation requirement
    if (lowerText.includes('need to be able to work out of our')) {
      const offices = lowerText.match(/work out of our ([^.]+)/i);
      if (offices && (offices[1].includes('ny') || offices[1].includes('sf') || offices[1].includes('new york') || offices[1].includes('san francisco'))) {
        return {
          suitable: false,
          reason: `Requires working from ${offices[1]} office - You are in India`
        };
      }
    }
    
    return { suitable: true };
  }

  checkWorkAuthorization(lowerText) {
    // Only reject if it explicitly REQUIRES US authorization as a hard requirement
    // Don't reject if it just asks IF you have authorization (you can answer No on the form)
    const requiresUSAuth = lowerText.includes('must be authorized to work') ||
                          lowerText.includes('required to be authorized') ||
                          lowerText.includes('you must have authorization');
    
    if (requiresUSAuth && lowerText.includes('united states')) {
      return {
        suitable: false,
        reason: 'Explicitly requires US work authorization - You need visa sponsorship'
      };
    }
    
    return { suitable: true };
  }

  checkPositionType(jobInfo, lowerText) {
    return lowerText.includes('intern') || lowerText.includes('internship');
  }

  generateWhyWorkHere(jobInfo, pageText) {
    const company = jobInfo.company || 'this company';
    
    // Extract key points about the company from the text
    const points = [];
    
    if (pageText.toLowerCase().includes('million')) {
      points.push('work with a product used by millions');
    }
    if (pageText.toLowerCase().includes('impact') || pageText.toLowerCase().includes('impactful')) {
      points.push('create impactful solutions');
    }
    if (pageText.toLowerCase().includes('mentor')) {
      points.push('learn from experienced mentors');
    }
    if (pageText.toLowerCase().includes('innovative') || pageText.toLowerCase().includes('cutting-edge')) {
      points.push('work on innovative technologies');
    }
    
    // Generate a personalized response
    const templates = [
      `I am excited about the opportunity to join ${company} as a Software Engineer Intern. With my strong foundation in full-stack development and proven track record through three successful internships, I am eager to contribute to building scalable solutions. As a Smart India Hackathon 2024 Grand Finale Winner, I bring both technical expertise and problem-solving skills. I am particularly drawn to ${company}'s mission and the opportunity to ${points[0] || 'make a meaningful impact'}.`,
      
      `As a final-year Computer Engineering student with hands-on experience in React, Node.js, and Next.js, I am thrilled about the prospect of interning at ${company}. My internship experiences at Techsnap, Grappltech, and Petuk Ji have equipped me with the skills to deliver impactful features. I am passionate about ${points[0] || 'building user-centric applications'} and believe ${company} is the perfect place to grow and contribute.`,
      
      `I want to work at ${company} because of the unique opportunity to ${points[0] || 'work on challenging problems'}. My experience includes building complete modules from scratch, creating admin panels, and implementing interactive features across web and mobile platforms. As someone who has solved 300+ competitive programming problems and led a team to SIH victory, I thrive in fast-paced environments and am excited to contribute to ${company}'s success.`
    ];
    
    // Pick first template
    return templates[0];
  }

  /**
   * Generate answers for common application questions
   */
  generateCommonAnswers(company) {
    return {
      whyCompany: this.generateWhyWorkHere({ company }, ''),
      howHeard: 'Job Board',
      priorInternships: '3+',
      degreeType: 'Undergraduate/Bachelors',
      graduationDate: '2026',
      currentLocation: 'Pune, India',
      pronouns: 'He/Him',
      roleInterest: ['Software Developer', 'Full-Stack Developer', 'Frontend Developer', 'Backend Developer']
    };
  }
}

export default JobAnalyzer;
