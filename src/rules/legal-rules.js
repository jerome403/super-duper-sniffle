/**
 * VA Claims Legal Rules Engine
 *
 * Encodes deterministic legal rules from:
 * - 38 CFR (Code of Federal Regulations)
 * - AMA (Appeals Modernization Act)
 * - Key case law precedents
 *
 * These rules form the foundation for appeal pathway recommendations.
 */

/**
 * Appeal pathway types under AMA
 */
export const APPEAL_PATHWAYS = {
  HLR: {
    id: 'HLR',
    name: 'Higher-Level Review',
    description: 'Same evidence reviewed by a more senior adjudicator',
    timeLimit: 365, // days from decision
    allowsNewEvidence: false,
    allowsHearing: true,
    averageProcessingDays: 125,
    bestFor: [
      'Clear and unmistakable error in rating',
      'Misapplication of law',
      'Evidence overlooked',
      'Rating criteria misunderstood'
    ]
  },
  SUPPLEMENTAL: {
    id: 'SUPPLEMENTAL',
    name: 'Supplemental Claim',
    description: 'Submit new and relevant evidence for de novo review',
    timeLimit: null, // No time limit
    allowsNewEvidence: true,
    allowsHearing: false,
    averageProcessingDays: 150,
    bestFor: [
      'New medical evidence available',
      'Missing nexus opinion',
      'Condition has worsened',
      'New buddy statements available'
    ]
  },
  BOARD_DIRECT: {
    id: 'BOARD_DIRECT',
    name: 'Board Appeal - Direct Review',
    description: 'Board reviews existing record without hearing',
    timeLimit: 365,
    allowsNewEvidence: false,
    allowsHearing: false,
    averageProcessingDays: 365,
    bestFor: [
      'Legal interpretation dispute',
      'Complex multi-issue case',
      'Prior BVA precedent favorable'
    ]
  },
  BOARD_EVIDENCE: {
    id: 'BOARD_EVIDENCE',
    name: 'Board Appeal - Evidence Submission',
    description: 'Submit new evidence to Board without hearing',
    timeLimit: 365,
    allowsNewEvidence: true,
    allowsHearing: false,
    averageProcessingDays: 450,
    bestFor: [
      'New evidence incoming but no hearing needed',
      'Documentary evidence is strong'
    ]
  },
  BOARD_HEARING: {
    id: 'BOARD_HEARING',
    name: 'Board Appeal - Hearing Request',
    description: 'Present case at Board hearing with option for new evidence',
    timeLimit: 365,
    allowsNewEvidence: true,
    allowsHearing: true,
    averageProcessingDays: 730,
    bestFor: [
      'Credibility is key issue',
      'Complex case needs explanation',
      'Veteran testimony would be compelling'
    ]
  }
};

/**
 * 38 CFR 3.159 - VA's Duty to Assist
 *
 * Key provisions that create appeal opportunities when violated
 */
export const DUTY_TO_ASSIST_RULES = {
  '3.159(c)(4)': {
    citation: '38 CFR § 3.159(c)(4)',
    name: 'Medical Examination Requirement',
    description: 'VA must provide medical examination when evidence indicates condition may be associated with service',
    triggers: [
      {
        id: 'no_exam_provided',
        description: 'VA denied without providing C&P examination',
        questions: [
          'Was a C&P examination provided for this claim?',
          'Did you submit evidence suggesting the condition is related to service?'
        ],
        weight: 0.9,
        recommendedPathway: 'HLR',
        reasoning: 'Failure to provide examination is clear procedural error correctable at HLR'
      },
      {
        id: 'inadequate_exam',
        description: 'C&P examination was inadequate (no rationale, wrong examiner, etc.)',
        questions: [
          'Did the examiner provide a rationale for their opinion?',
          'Was the examiner qualified for your specific condition?',
          'Did the examiner review your complete medical history?'
        ],
        weight: 0.85,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Inadequate exam is best addressed with new, adequate medical opinion'
      }
    ]
  },
  '3.159(c)(2)': {
    citation: '38 CFR § 3.159(c)(2)',
    name: 'Federal Records Duty',
    description: 'VA must obtain relevant federal records (VA treatment, SSA, military personnel)',
    triggers: [
      {
        id: 'missing_va_records',
        description: 'VA treatment records not obtained',
        questions: [
          'Do you have VA treatment records relevant to this claim that weren\'t obtained?',
          'Were you treated at VA facilities for this condition?'
        ],
        weight: 0.9,
        recommendedPathway: 'HLR',
        reasoning: 'Missing VA records is clear duty to assist violation'
      },
      {
        id: 'missing_service_records',
        description: 'Service treatment records incomplete or not obtained',
        questions: [
          'Are your service treatment records complete in your file?',
          'Were there records from sick call or field medical that might be missing?'
        ],
        weight: 0.85,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Can submit records yourself or request formal records search'
      }
    ]
  },
  '3.159(c)(1)': {
    citation: '38 CFR § 3.159(c)(1)',
    name: 'Private Records Assistance',
    description: 'VA must make reasonable efforts to obtain private medical records veteran identifies',
    triggers: [
      {
        id: 'private_records_not_requested',
        description: 'VA did not attempt to obtain identified private records',
        questions: [
          'Did you identify private medical records on your claim form?',
          'Did VA send records requests to those providers?'
        ],
        weight: 0.7,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Best to submit the records yourself with supplemental claim'
      }
    ]
  }
};

/**
 * 38 CFR 3.303 - Service Connection Principles
 */
export const SERVICE_CONNECTION_RULES = {
  '3.303(a)': {
    citation: '38 CFR § 3.303(a)',
    name: 'Direct Service Connection',
    description: 'Requires: (1) current disability, (2) in-service incurrence, (3) nexus between them',
    elements: ['current_disability', 'in_service_event', 'nexus'],
    triggers: [
      {
        id: 'nexus_missing',
        description: 'Denial based on lack of nexus opinion',
        questions: [
          'Was your claim denied for lack of medical nexus?',
          'Do you have a doctor willing to provide a nexus opinion?'
        ],
        weight: 0.95,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'New nexus opinion is "new and relevant evidence" for supplemental claim'
      },
      {
        id: 'in_service_event_denied',
        description: 'VA did not concede in-service event occurred',
        questions: [
          'Did VA acknowledge your in-service injury/event?',
          'Do you have buddy statements about the event?',
          'Are there service records documenting the event?'
        ],
        weight: 0.8,
        recommendedPathway: 'BOARD_HEARING',
        reasoning: 'Credibility determination best made at Board hearing'
      }
    ]
  },
  '3.303(b)': {
    citation: '38 CFR § 3.303(b)',
    name: 'Continuity of Symptomatology',
    description: 'For chronic diseases listed in 3.309(a), continuity can establish nexus',
    chronicDiseases: [
      'arthritis', 'cardiovascular-renal disease', 'diabetes mellitus',
      'hypertension', 'psychoses', 'malignant tumors', 'multiple sclerosis',
      'organic diseases of the nervous system', 'peptic ulcers'
    ],
    triggers: [
      {
        id: 'chronic_disease_continuity',
        description: 'Chronic disease with continuous symptoms since service',
        questions: [
          'Is your condition a chronic disease under 38 CFR 3.309(a)?',
          'Have you had continuous symptoms since service?',
          'Can you document treatment history showing continuity?'
        ],
        weight: 0.85,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Submit documentation of continuous treatment as new evidence'
      }
    ]
  },
  '3.310': {
    citation: '38 CFR § 3.310',
    name: 'Secondary Service Connection',
    description: 'Disability caused or aggravated by already service-connected condition',
    triggers: [
      {
        id: 'secondary_nexus_needed',
        description: 'Secondary claim denied for lack of medical connection',
        questions: [
          'Is this a secondary claim based on an already service-connected condition?',
          'Did you provide medical evidence linking the conditions?'
        ],
        weight: 0.9,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Need medical opinion establishing secondary relationship'
      },
      {
        id: 'aggravation_baseline',
        description: 'VA did not properly establish aggravation baseline',
        questions: [
          'If aggravation claim, did VA establish a baseline severity?',
          'Was the aggravation amount properly calculated?'
        ],
        weight: 0.75,
        recommendedPathway: 'HLR',
        reasoning: 'Baseline calculation error is correctable at HLR'
      }
    ]
  }
};

/**
 * 38 CFR 3.352(a) - Aid and Attendance Criteria
 *
 * Special monthly compensation criteria
 */
export const AID_AND_ATTENDANCE_RULES = {
  '3.352(a)': {
    citation: '38 CFR § 3.352(a)',
    name: 'Aid and Attendance Requirements',
    description: 'Criteria for special monthly compensation based on need for aid and attendance',
    criteria: [
      {
        id: 'inability_dress',
        description: 'Inability to dress or undress',
        weight: 0.2
      },
      {
        id: 'inability_clean',
        description: 'Inability to keep clean and presentable',
        weight: 0.2
      },
      {
        id: 'frequent_adjustment',
        description: 'Frequent need of adjustment of prosthetic or orthopedic appliances',
        weight: 0.15
      },
      {
        id: 'inability_feed',
        description: 'Inability to feed self',
        weight: 0.25
      },
      {
        id: 'inability_toilet',
        description: 'Inability to attend to wants of nature',
        weight: 0.25
      },
      {
        id: 'incapacity_physical_mental',
        description: 'Physical or mental incapacity requiring care to protect from hazards',
        weight: 0.3
      },
      {
        id: 'bedridden',
        description: 'Bedridden status',
        weight: 0.4
      }
    ],
    triggers: [
      {
        id: 'a_and_a_criteria_met',
        description: 'One or more A&A criteria clearly documented but denied',
        questions: [
          'Did the VA decision address each A&A criterion?',
          'Do you have medical documentation of these limitations?',
          'Did the examiner observe your daily living limitations?'
        ],
        weight: 0.8,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Submit detailed medical documentation of ADL limitations'
      }
    ]
  }
};

/**
 * Key Case Law Violations
 *
 * Common legal errors that create strong appeal grounds
 */
export const CASE_LAW_VIOLATIONS = {
  'COLVIN': {
    citation: 'Colvin v. Derwinski, 1 Vet. App. 171 (1991)',
    name: 'Colvin Violation',
    description: 'VA adjudicator substituted own medical judgment for competent medical evidence',
    indicators: [
      'Decision rejects medical opinion without contrary medical evidence',
      'Rater draws own medical conclusions about causation',
      'Decision states condition "cannot be" related without medical support'
    ],
    triggers: [
      {
        id: 'colvin_violation',
        description: 'VA rejected medical evidence using own judgment',
        questions: [
          'Did you submit a medical opinion supporting your claim?',
          'Did VA reject it without providing a contrary medical opinion?',
          'Did the decision make medical conclusions without citing medical evidence?'
        ],
        weight: 0.95,
        recommendedPathway: 'HLR',
        reasoning: 'Colvin violation is clear legal error correctable at HLR'
      }
    ]
  },
  'CALUZA': {
    citation: 'Caluza v. Brown, 7 Vet. App. 498 (1995)',
    name: 'Caluza Elements',
    description: 'Three elements for service connection: current disability, in-service incurrence, nexus',
    triggers: [
      {
        id: 'caluza_element_conceded',
        description: 'VA conceded elements but still denied',
        questions: [
          'Did VA concede you have a current disability?',
          'Did VA concede an in-service event occurred?',
          'Did VA still deny the claim?'
        ],
        weight: 0.9,
        recommendedPathway: 'HLR',
        reasoning: 'If two elements conceded, error in nexus determination is reviewable'
      }
    ]
  },
  'SHEDDEN': {
    citation: 'Shedden v. Principi, 381 F.3d 1163 (Fed. Cir. 2004)',
    name: 'Shedden Framework',
    description: 'Federal Circuit formulation of service connection elements',
    triggers: [
      {
        id: 'shedden_framework',
        description: 'Decision did not properly apply Shedden framework',
        weight: 0.7,
        recommendedPathway: 'BOARD_DIRECT',
        reasoning: 'Legal framework error best addressed by Board'
      }
    ]
  },
  'GILBERT': {
    citation: 'Gilbert v. Derwinski, 1 Vet. App. 49 (1990)',
    name: 'Benefit of the Doubt',
    description: 'When evidence is in equipoise, benefit of doubt goes to veteran',
    triggers: [
      {
        id: 'benefit_of_doubt_not_applied',
        description: 'VA did not apply benefit of doubt when evidence was in equipoise',
        questions: [
          'Was there both favorable and unfavorable medical evidence?',
          'Did the decision explain why the evidence was not in equipoise?',
          'Did VA simply choose the negative opinion without explanation?'
        ],
        weight: 0.85,
        recommendedPathway: 'HLR',
        reasoning: 'Failure to apply benefit of doubt is reviewable error'
      }
    ]
  },
  'NIEVES_RODRIGUEZ': {
    citation: 'Nieves-Rodriguez v. Peake, 22 Vet. App. 295 (2008)',
    name: 'Medical Opinion Adequacy',
    description: 'Medical opinions must contain clear conclusions with supporting rationale',
    triggers: [
      {
        id: 'opinion_no_rationale',
        description: 'VA relied on medical opinion lacking rationale',
        questions: [
          'Did the C&P examiner provide detailed reasoning?',
          'Did the opinion just state a conclusion without explanation?',
          'Did the examiner address your specific medical history?'
        ],
        weight: 0.8,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'Get new opinion with proper rationale per Nieves-Rodriguez'
      }
    ]
  },
  'HORN': {
    citation: 'Horn v. Shinseki, 25 Vet. App. 231 (2012)',
    name: 'Competent Lay Evidence',
    description: 'Lay evidence is competent for symptoms observable by layperson',
    triggers: [
      {
        id: 'lay_evidence_rejected',
        description: 'VA improperly rejected competent lay evidence',
        questions: [
          'Did you provide statements about your symptoms?',
          'Did VA reject your statements as not credible without explanation?',
          'Are your reported symptoms things you can directly observe (pain, limitation, etc.)?'
        ],
        weight: 0.75,
        recommendedPathway: 'BOARD_HEARING',
        reasoning: 'Board hearing allows you to provide testimony and establish credibility'
      }
    ]
  },
  'CLEMONS': {
    citation: 'Clemons v. Shinseki, 23 Vet. App. 1 (2009)',
    name: 'Sympathetic Reading of Claims',
    description: 'VA must consider all reasonably raised claims from the symptoms described',
    triggers: [
      {
        id: 'narrow_claim_interpretation',
        description: 'VA interpreted claim too narrowly',
        questions: [
          'Did you describe symptoms that could indicate multiple conditions?',
          'Did VA only consider the specific condition you named?',
          'Could your symptoms support a different diagnosis?'
        ],
        weight: 0.7,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'File supplemental with proper diagnosis identified'
      }
    ]
  }
};

/**
 * Rating Schedule Rules
 *
 * Common rating errors and their remedies
 */
export const RATING_SCHEDULE_RULES = {
  'STAGED_RATINGS': {
    citation: 'Fenderson v. West, 12 Vet. App. 119 (1999)',
    name: 'Staged Ratings',
    description: 'Different ratings can be assigned for different periods based on severity',
    triggers: [
      {
        id: 'no_staged_ratings',
        description: 'VA did not consider staged ratings when condition varied',
        questions: [
          'Has your condition severity changed over time?',
          'Did VA assign a single rating for the entire period?',
          'Do you have evidence of worse periods?'
        ],
        weight: 0.7,
        recommendedPathway: 'HLR',
        reasoning: 'Failure to consider staged ratings is reviewable error'
      }
    ]
  },
  'DIAGNOSTIC_CODE': {
    name: 'Diagnostic Code Selection',
    description: 'VA must apply most favorable applicable diagnostic code',
    triggers: [
      {
        id: 'wrong_diagnostic_code',
        description: 'VA used wrong or less favorable diagnostic code',
        questions: [
          'Do you know what diagnostic code was used?',
          'Are there other diagnostic codes that could apply to your condition?',
          'Would a different code result in a higher rating?'
        ],
        weight: 0.8,
        recommendedPathway: 'HLR',
        reasoning: 'Diagnostic code selection is legal determination reviewable at HLR'
      }
    ]
  },
  'FUNCTIONAL_LOSS': {
    citation: 'DeLuca v. Brown, 8 Vet. App. 202 (1995)',
    name: 'Functional Loss Consideration',
    description: 'For joint disabilities, VA must consider functional loss due to pain',
    triggers: [
      {
        id: 'deluca_not_applied',
        description: 'VA did not consider functional loss from pain/flare-ups',
        questions: [
          'Is this a joint or musculoskeletal condition?',
          'Did the examiner measure range of motion during a flare-up?',
          'Did VA consider your reported pain and functional limitations?'
        ],
        weight: 0.85,
        recommendedPathway: 'SUPPLEMENTAL',
        reasoning: 'New exam documenting functional loss during flare-up'
      }
    ]
  }
};

/**
 * Time-based Rules
 */
export const TIMING_RULES = {
  PRESUMPTIVE_PERIODS: {
    description: 'Conditions manifesting within certain periods are presumed service-connected',
    periods: {
      'chronic_disease': {
        days: 365,
        description: 'Chronic diseases manifesting to 10% within 1 year',
        applies_to: SERVICE_CONNECTION_RULES['3.303(b)'].chronicDiseases
      },
      'tropical_disease': {
        days: 365,
        description: 'Tropical diseases within 1 year'
      },
      'gulf_war': {
        description: 'Gulf War presumptive conditions - specific rules apply'
      },
      'agent_orange': {
        description: 'Agent Orange presumptive conditions - specific rules apply'
      },
      'radiation': {
        description: 'Radiation exposure conditions - specific rules apply'
      }
    }
  },
  APPEAL_DEADLINES: {
    HLR: { days: 365, description: '1 year from decision date' },
    SUPPLEMENTAL: { days: null, description: 'No time limit, but affects effective date' },
    BOARD: { days: 365, description: '1 year from decision date' },
    LEGACY_NOD: { days: 365, description: '1 year from decision (pre-AMA)' }
  }
};

/**
 * Get all applicable rules for a given situation
 */
export function getAllRules() {
  return {
    dutyToAssist: DUTY_TO_ASSIST_RULES,
    serviceConnection: SERVICE_CONNECTION_RULES,
    aidAndAttendance: AID_AND_ATTENDANCE_RULES,
    caseLaw: CASE_LAW_VIOLATIONS,
    ratingSchedule: RATING_SCHEDULE_RULES,
    timing: TIMING_RULES
  };
}

/**
 * Get all triggers across all rule categories
 */
export function getAllTriggers() {
  const triggers = [];

  const ruleCategories = [
    { name: 'dutyToAssist', rules: DUTY_TO_ASSIST_RULES },
    { name: 'serviceConnection', rules: SERVICE_CONNECTION_RULES },
    { name: 'aidAndAttendance', rules: AID_AND_ATTENDANCE_RULES },
    { name: 'caseLaw', rules: CASE_LAW_VIOLATIONS },
    { name: 'ratingSchedule', rules: RATING_SCHEDULE_RULES }
  ];

  for (const category of ruleCategories) {
    for (const [ruleId, rule] of Object.entries(category.rules)) {
      if (rule.triggers) {
        for (const trigger of rule.triggers) {
          triggers.push({
            ...trigger,
            ruleId,
            category: category.name,
            citation: rule.citation,
            ruleName: rule.name
          });
        }
      }
    }
  }

  return triggers;
}

export default {
  APPEAL_PATHWAYS,
  DUTY_TO_ASSIST_RULES,
  SERVICE_CONNECTION_RULES,
  AID_AND_ATTENDANCE_RULES,
  CASE_LAW_VIOLATIONS,
  RATING_SCHEDULE_RULES,
  TIMING_RULES,
  getAllRules,
  getAllTriggers
};
