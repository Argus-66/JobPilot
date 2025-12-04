# 📁 Project Structure Overview

## ✅ Complete File Structure

```
JobSearchAutomation/
│
├── 📄 package.json                    # Node.js dependencies & scripts
├── 📄 README.md                       # Project overview
├── 📄 SETUP.md                        # Detailed setup instructions
├── 📄 .env                            # Your environment config
├── 📄 .env.example                    # Environment template
├── 📄 .gitignore                      # Git ignore rules
│
├── 📂 src/                            # Source code
│   ├── 📄 index.js                    # 🚀 Main entry point
│   │
│   ├── 📂 components/                 # Core automation modules
│   │   ├── 📄 browser-manager.js      # Browser launch & control
│   │   ├── 📄 search-handler.js       # Google search automation
│   │   ├── 📄 form-filler.js          # Smart form auto-fill
│   │   └── 📄 application-submitter.js # Job application flow
│   │
│   └── 📂 utils/                      # Helper utilities
│       ├── 📄 logger.js               # Logging to console & files
│       ├── 📄 config-loader.js        # Load configs & validate
│       ├── 📄 user-input.js           # Handle user prompts
│       └── 📄 field-matcher.js        # Match form fields to data
│
├── 📂 config/                         # Configuration files
│   └── 📄 search-queries.json         # Your job search queries
│
├── 📂 data/                           # Your personal data
│   ├── 📄 personal-details.example.json  # Template for your info
│   ├── ⚠️  personal-details.json      # YOUR INFO (create this)
│   └── ⚠️  resume.pdf                 # YOUR RESUME (add this)
│
└── 📂 logs/                           # Auto-generated logs
    └── session-YYYY-MM-DD.log         # Activity logs
```

## 🔧 Component Breakdown

### Main Components (4 files)

1. **browser-manager.js** (150 lines)
   - Launches Playwright browser
   - Manages tabs and navigation
   - Detects CAPTCHAs
   - Handles timeouts

2. **search-handler.js** (85 lines)
   - Performs Google searches
   - Extracts job posting links
   - Filters by platform (Greenhouse, Lever, Ashby)
   - Removes duplicates

3. **form-filler.js** (265 lines)
   - Intelligently fills form fields
   - Uploads resume files
   - Handles checkboxes & dropdowns
   - Maps fields to personal data

4. **application-submitter.js** (140 lines)
   - Orchestrates application flow
   - Extracts job information
   - Coordinates form filling
   - Manages user confirmations

### Utilities (4 files)

1. **logger.js** (70 lines)
   - Console logging with levels
   - File logging for sessions
   - Timestamp tracking

2. **config-loader.js** (90 lines)
   - Loads JSON configs
   - Validates file existence
   - Parses environment variables
   - Provides defaults

3. **user-input.js** (65 lines)
   - Prompts for user input
   - CAPTCHA wait handling
   - Missing field requests
   - Submission confirmations

4. **field-matcher.js** (150 lines)
   - Maps form fields to personal data
   - Fuzzy matching algorithm
   - Field name normalization
   - Nested data access

### Main Orchestrator

**index.js** (180 lines)
- Initializes all components
- Coordinates search → apply flow
- Error handling
- Cleanup on exit

## 📊 Total Code Stats

- **Total Files**: 13 source files
- **Total Lines**: ~1,200 lines of clean, modular code
- **No file over 300 lines** - easy to understand!

## 🎯 What You Need to Do

### Required (Before First Run):

1. ✅ Install dependencies:
   ```bash
   npm install
   npm run install-browsers
   ```

2. ✅ Add your resume:
   - Save as: `data/resume.pdf`

3. ✅ Create personal details:
   ```bash
   cp data/personal-details.example.json data/personal-details.json
   ```
   - Edit with your real information

### Optional (Customization):

1. Edit `config/search-queries.json` - add/modify job searches
2. Edit `.env` - adjust automation settings
3. Modify field mappings in `src/utils/field-matcher.js` if needed

## 🚀 Ready to Run!

Once you've added your resume and personal details:

```bash
npm start
```

The automation will:
1. Open a browser window
2. Search for jobs on Greenhouse, Lever, and Ashby
3. Auto-fill applications with your data
4. Wait for your approval before submitting
5. Handle CAPTCHAs and missing fields gracefully

## 🛡️ Safety Features

- ✅ No auto-submit (you review everything)
- ✅ CAPTCHA detection and pause
- ✅ Missing field prompts
- ✅ Confirmation before each submission
- ✅ Complete logging for transparency
- ✅ Can stop at any time

---

**All set! Add your resume and personal details, then run `npm start`** 🎉
