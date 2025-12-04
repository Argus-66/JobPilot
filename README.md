# Job Search Automation

Automated job search and application assistant that helps streamline your job hunting process.

## Features

- Automated Google search for jobs on Greenhouse, Lever, and Ashby platforms
- Smart form filling from personal details
- Resume upload automation
- CAPTCHA and manual intervention support
- Modular architecture for easy maintenance

## Setup

1. Install dependencies:
   ```bash
   npm install
   npm run install-browsers
   ```

2. Configure your environment:
   ```bash
   cp .env.example .env
   ```

3. Add your files:
   - Place your resume at `data/resume.pdf`
   - Create your personal details at `data/personal-details.json` (see template)

4. Configure search queries in `config/search-queries.json`

## Usage

```bash
npm start
```

## Project Structure

```
├── src/
│   ├── index.js              # Main entry point
│   ├── components/           # Core automation components
│   ├── handlers/             # Platform-specific handlers
│   └── utils/                # Utility functions
├── config/                   # Configuration files
├── data/                     # Your resume and personal details
└── logs/                     # Application logs
```

## Important Notes

- This tool is for assistance only - always review applications before submission
- Respect job platforms' Terms of Service
- Use responsibly and ethically
# JobPilot
