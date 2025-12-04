/**
 * Field mapping utilities to match form fields with personal details
 */

const FIELD_MAPPINGS = {
  // Name fields
  firstName: ['first_name', 'firstname', 'first-name', 'given_name', 'givenname'],
  lastName: ['last_name', 'lastname', 'last-name', 'family_name', 'familyname', 'surname'],
  fullName: ['full_name', 'fullname', 'full-name', 'name', 'your_name', 'yourname'],
  
  // Contact fields
  email: ['email', 'email_address', 'e-mail', 'emailaddress', 'mail'],
  phone: ['phone', 'phone_number', 'phonenumber', 'telephone', 'mobile', 'cell'],
  
  // Personal Info
  dateOfBirth: ['date_of_birth', 'dob', 'birth_date', 'birthdate', 'birthday'],
  currentLocation: ['current_location', 'current location', 'where are you located'],
  pronouns: ['pronoun', 'pronouns', 'preferred pronouns'],
  
  // Location fields
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region'],
  country: ['country'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal', 'postalcode', 'postal_code'],
  location: ['location', 'address'],
  
  // Links
  linkedin: ['linkedin', 'linkedin_url', 'linkedin_profile'],
  github: ['github', 'github_url', 'github_username', 'github link'],
  portfolio: ['portfolio', 'portfolio_url', 'website', 'personal_website'],
  
  // Work Authorization
  authorized: ['authorized', 'work_authorization', 'legally_authorized', 'right_to_work'],
  requiresSponsorship: ['sponsorship', 'require_sponsorship', 'visa_sponsorship', 'need_sponsorship'],
  
  // Experience
  yearsOfExperience: ['years_experience', 'experience_years', 'years_of_experience', 'experience'],
  currentCompany: ['current_company', 'employer', 'company'],
  currentTitle: ['current_title', 'job_title', 'title', 'position'],
  priorInternships: ['prior internships', 'previous internships', 'how many internships'],
  
  // Education
  degree: ['degree', 'education_level', 'highest_degree', 'degree type'],
  fieldOfStudy: ['field of study', 'major', 'study_field', 'area of study', 'concentration'],
  university: ['university', 'school', 'college', 'institution'],
  graduationYear: ['graduation_year', 'grad_year', 'year_graduated'],
  graduationDate: ['graduation_date', 'graduation date', 'expected graduation'],
  educationLevel: ['current level of education', 'education level', 'degree type', 'level of education'],
  
  // Availability
  startDate: ['start_date', 'available_start', 'availability', 'notice_period'],
  expectedStartDate: ['expected start date', 'start date for internship', 'internship start date', 'when can you start'],
  fullTimeAvailability: ['full-time internship', 'available for a full-time', 'full time availability'],
  
  // Skills & Interests
  programmingLanguages: ['programming languages', 'languages you are proficient', 'list the programming'],
  softwareEngineeringInterests: ['area of software engineering', 'software engineering interests', 'what interests you'],
  
  // Demographics (often optional)
  gender: ['gender', 'sex'],
  ethnicity: ['ethnicity', 'race', 'ethnic_background'],
  veteran: ['veteran', 'veteran_status', 'military'],
  disability: ['disability', 'disability_status'],
  
  // Application-specific
  whyCompany: ['why do you want to work', 'why this company', 'why join', 'motivation'],
  howHeard: ['how did you hear', 'how did you find', 'referral source'],
  roleInterest: ['type of role', 'interested in', 'role preference'],
  coverLetter: ['cover_letter', 'coverletter', 'message', 'additional_info'],
  referralSource: ['referral', 'how_did_you_hear', 'source', 'referral_source']
};

/**
 * Match a field name/id/label to a personal detail key
 */
export function matchField(fieldIdentifier) {
  const normalized = fieldIdentifier.toLowerCase().replace(/[\s_-]/g, '');
  
  for (const [detailKey, variants] of Object.entries(FIELD_MAPPINGS)) {
    const normalizedVariants = variants.map(v => v.replace(/[\s_-]/g, ''));
    if (normalizedVariants.some(variant => normalized.includes(variant) || variant.includes(normalized))) {
      return detailKey;
    }
  }
  
  return null;
}

/**
 * Get value from personal details using dot notation
 */
export function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Map personal details to a flat structure for easier access
 */
export function flattenPersonalDetails(personalDetails) {
  const flat = {};
  
  // Personal Info
  flat.firstName = personalDetails.personalInfo?.firstName;
  flat.lastName = personalDetails.personalInfo?.lastName;
  flat.fullName = personalDetails.personalInfo?.fullName;
  flat.email = personalDetails.personalInfo?.email;
  flat.phone = personalDetails.personalInfo?.phone;
  flat.linkedin = personalDetails.personalInfo?.linkedin;
  flat.github = personalDetails.personalInfo?.github;
  flat.portfolio = personalDetails.personalInfo?.portfolio;
  flat.website = personalDetails.personalInfo?.website;
  flat.pronouns = personalDetails.personalInfo?.pronouns;
  
  // Location
  flat.city = personalDetails.personalInfo?.location?.city;
  flat.state = personalDetails.personalInfo?.location?.state;
  flat.country = personalDetails.personalInfo?.location?.country;
  flat.zipCode = personalDetails.personalInfo?.location?.zipCode;
  flat.currentLocation = personalDetails.personalInfo?.location?.currentLocation;
  
  // Work Authorization
  flat.authorized = personalDetails.workAuthorization?.authorized;
  flat.requiresSponsorship = personalDetails.workAuthorization?.requiresSponsorship;
  flat.visaStatus = personalDetails.workAuthorization?.visaStatus;
  
  // Availability
  flat.startDate = personalDetails.availability?.startDate;
  flat.willingToRelocate = personalDetails.availability?.willingToRelocate;
  flat.fullTimeAvailability = 'Yes';
  
  // Experience
  flat.yearsOfExperience = personalDetails.experience?.yearsOfExperience;
  flat.currentCompany = personalDetails.experience?.mostRecentCompany;
  flat.currentTitle = personalDetails.experience?.mostRecentTitle;
  flat.priorInternships = personalDetails.experience?.totalInternships;
  
  // Education
  flat.degree = personalDetails.education?.degree;
  flat.fieldOfStudy = personalDetails.education?.field;
  flat.university = personalDetails.education?.university;
  flat.graduationYear = personalDetails.education?.graduationYear;
  flat.graduationDate = personalDetails.education?.graduationYear;
  flat.educationLevel = 'Undergrad';
  
  // Availability
  flat.startDate = personalDetails.availability?.startDate;
  flat.willingToRelocate = personalDetails.availability?.willingToRelocate;
  flat.fullTimeAvailability = 'Yes';
  
  // Skills
  flat.programmingLanguages = personalDetails.skills?.technical?.filter(skill => 
    ['C++', 'Python', 'JavaScript', 'Java', 'TypeScript', 'Go', 'Rust'].some(lang => skill.includes(lang))
  ).join(', ') || 'JavaScript, C++, Python, Node.js';
  
  flat.softwareEngineeringInterests = ['Full-stack Development', 'Frontend Development', 'Backend Development'];
  
  // Demographics
  flat.gender = personalDetails.demographics?.gender;
  flat.ethnicity = personalDetails.demographics?.ethnicity;
  flat.race = personalDetails.demographics?.race;
  flat.veteran = personalDetails.demographics?.veteran;
  flat.disability = personalDetails.demographics?.disability;
  
  // Additional
  flat.coverLetter = personalDetails.additionalInfo?.coverLetter;
  flat.referralSource = personalDetails.additionalInfo?.referralSource;
  flat.howHeard = personalDetails.additionalInfo?.howHeard;
  flat.roleInterest = personalDetails.additionalInfo?.roleInterests;
  
  return flat;
}

export { FIELD_MAPPINGS };
