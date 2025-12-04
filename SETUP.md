# Quick Setup Guide

## Prerequisites
- Node.js installed (v18 or higher)
- Your resume as a PDF file
- Your personal information ready

## Setup Steps

### 1. Install Dependencies
```bash
npm install
npm run install-browsers
```

### 2. Add Your Files

**Resume:**
- Place your resume at: `data/resume.pdf`

**Personal Details:**
- Copy the template:
  ```bash
  cp data/personal-details.example.json data/personal-details.json
  ```
- Edit `data/personal-details.json` with your information

### 3. Configure Search Queries (Optional)

Edit `config/search-queries.json` to:
- Enable/disable specific job searches
- Add new search queries
- Modify existing ones

### 4. Configure Settings (Optional)

The `.env` file is already created with defaults. You can modify:
- `HEADLESS`: Set to `true` to run browser in background
- `MAX_APPLICATIONS_PER_RUN`: Limit applications per session
- `SLOW_MO`: Adjust automation speed (higher = slower)

## Running the Automation

```bash
npm start
```

## What Happens When You Run It

1. ✅ Browser opens (visible by default)
2. ✅ Searches Google for jobs on Greenhouse, Lever, Ashby
3. ✅ Opens each job posting in a new tab
4. ✅ Fills application forms with your details
5. ✅ Uploads your resume
6. ⏸️ Pauses for CAPTCHAs (you solve them)
7. ⏸️ Asks for missing information if needed
8. ⏸️ Waits for your confirmation before submitting
9. ✅ Moves to next job

## Important Features

### Semi-Automated Approach
- **Auto-fills** forms but **doesn't auto-submit**
- You review and submit each application manually
- Safe and prevents mistakes

### CAPTCHA Handling
- Detects CAPTCHAs automatically
- Pauses and waits for you to solve them
- Continues automatically after

### Smart Field Matching
- Recognizes common form fields
- Maps them to your personal details
- Asks you for any missing information

### Logging
- All activity logged to `logs/` folder
- Helpful for debugging and tracking

## Tips

1. **Start Small**: Test with 1-2 applications first
2. **Review Forms**: Always check before submitting
3. **Customize Queries**: Tailor searches to your target roles
4. **Update Details**: Keep personal-details.json current
5. **Check Logs**: Review logs if something goes wrong

## Troubleshooting

**"personal-details.json not found"**
- Make sure you copied and edited the example file

**"resume.pdf not found"**
- Place your resume in the `data/` folder

**Browser doesn't open**
- Run `npm run install-browsers` again

**Fields not filling correctly**
- Check the logs to see what's happening
- Update field-matcher.js if needed

## Project Structure

```
JobSearchAutomation/
├── src/
│   ├── index.js                    # Main entry point
│   ├── components/
│   │   ├── browser-manager.js      # Browser control
│   │   ├── search-handler.js       # Google search
│   │   ├── form-filler.js          # Form auto-fill
│   │   └── application-submitter.js # Application flow
│   └── utils/
│       ├── logger.js               # Logging utility
│       ├── config-loader.js        # Config management
│       ├── user-input.js           # User prompts
│       └── field-matcher.js        # Field detection
├── config/
│   └── search-queries.json         # Your job searches
├── data/
│   ├── resume.pdf                  # Your resume (add this)
│   └── personal-details.json       # Your info (add this)
├── logs/                           # Auto-generated logs
├── .env                            # Environment config
└── package.json                    # Dependencies
```

## Next Steps

After setup:
1. Add your resume to `data/resume.pdf`
2. Create `data/personal-details.json` from the example
3. Run `npm install`
4. Run `npm start`
5. Watch the magic happen! ✨
