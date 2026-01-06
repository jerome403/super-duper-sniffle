# VA Claims Expert System

An intelligent system for analyzing veteran disability claims and recommending optimal appeal pathways under the Appeals Modernization Act (AMA).

## Features

- **Legal Rules Engine**: Encodes 38 CFR regulations and key case law (Colvin, Caluza, Gilbert, etc.)
- **Appeal Pathway Analysis**: Recommends HLR, Supplemental Claim, or Board Appeal based on case specifics
- **Condition Profiles**: Condition-specific patterns from BVA decisions
- **Interactive Questionnaire**: Guided analysis through relevant questions
- **Deadline Tracking**: Calculate appeal deadlines from decision date

## Installation

```bash
npm install
```

## Usage

### Interactive Analysis

Run the full interactive questionnaire:

```bash
npm run cli analyze
```

### Quick Analysis

Get a quick recommendation with minimal questions:

```bash
npm run cli quick
```

### Check Deadlines

Calculate appeal deadlines from a decision date:

```bash
npm run cli deadline 2024-06-15
```

### View Legal Rules

Display all legal rules in the database:

```bash
npm run cli rules
```

### View Appeal Pathways

Display all appeal pathway options:

```bash
npm run cli pathways
```

## Appeal Pathways Under AMA

| Pathway | Time Limit | New Evidence | Hearing | Avg. Processing |
|---------|------------|--------------|---------|-----------------|
| Higher-Level Review (HLR) | 1 year | No | Informal conference | ~125 days |
| Supplemental Claim | None* | Yes | No | ~150 days |
| Board - Direct Review | 1 year | No | No | ~365 days |
| Board - Evidence | 1 year | Yes | No | ~450 days |
| Board - Hearing | 1 year | Yes | Yes | ~730 days |

*No time limit, but filing within 1 year preserves effective date.

## Key Legal Rules Encoded

### Duty to Assist (38 CFR 3.159)
- **3.159(c)(4)**: VA must provide medical examination
- **3.159(c)(2)**: VA must obtain federal records
- **3.159(c)(1)**: VA must assist with private records

### Service Connection (38 CFR 3.303, 3.310)
- **3.303(a)**: Direct service connection elements
- **3.303(b)**: Continuity of symptomatology for chronic diseases
- **3.310**: Secondary service connection

### Key Case Law
- **Colvin v. Derwinski**: VA cannot substitute own medical judgment
- **Caluza v. Brown**: Three elements for service connection
- **Gilbert v. Derwinski**: Benefit of the doubt standard
- **Nieves-Rodriguez v. Peake**: Medical opinion adequacy
- **DeLuca v. Brown**: Functional loss consideration

## Project Structure

```
va-claims-expert/
├── bin/
│   └── cli.js              # Command-line interface
├── src/
│   ├── index.js            # Main entry point
│   ├── rules/
│   │   ├── legal-rules.js  # Legal rules database
│   │   └── rule-evaluator.js
│   ├── recommendation/
│   │   └── pathway-recommender.js
│   ├── profiles/
│   │   └── condition-profiles.js
│   └── fetcher/
│       └── bva-fetcher.js  # BVA decision fetcher (stub)
├── data/
│   └── conditions/         # Condition profile JSON files
└── test/
```

## Programmatic API

```javascript
import { analyzeCase, checkDeadlines } from 'va-claims-expert';

// Analyze a case
const recommendation = analyzeCase({
  condition: 'tinnitus',
  facts: {
    examProvided: true,
    examAdequate: false,
    hasNexusOpinion: false,
    currentDisabilityConceded: true,
    inServiceEventConceded: true
  },
  strategicFactors: {
    time_sensitivity: 'moderate',
    evidence_strength: 'moderate'
  }
});

console.log(recommendation.primaryPathway.pathway.name);
console.log(recommendation.actionItems);

// Check deadlines
const deadlines = checkDeadlines('2024-06-15');
console.log(deadlines.pathwayDeadlines);
```

## Future Enhancements

- [ ] BVA decision fetching from public records
- [ ] AI-powered decision text analysis
- [ ] Web UI with progress tracking
- [ ] Integration with VA forms (20-0995, 20-0996, 10182)
- [ ] Veteran forum integration for pattern discovery
- [ ] VSO/attorney referral recommendations

## Disclaimer

This tool is for educational and informational purposes only. It does not constitute legal advice. Veterans should consult with an accredited Veterans Service Organization (VSO), attorney, or claims agent for personalized assistance with their claims.

## License

MIT
