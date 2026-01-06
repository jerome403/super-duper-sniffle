/**
 * VA Claims Case Data Schema
 *
 * Formal schema definitions for case data structures used throughout
 * the decision-support system. Ready for validation and AI enhancement.
 *
 * @module models/case-schema
 */

/**
 * Evidence flags indicating what documentation exists in the record
 * @typedef {Object} EvidenceFlags
 * @property {boolean} hasServiceTreatmentRecords - STRs are in the record
 * @property {boolean} hasVATreatmentRecords - VA medical records obtained
 * @property {boolean} hasPrivateMedicalRecords - Private provider records
 * @property {boolean} hasCPExam - C&P examination was conducted
 * @property {boolean} hasNexusOpinion - Medical nexus opinion exists
 * @property {boolean} hasIMO - Independent Medical Opinion submitted
 * @property {boolean} hasBuddyStatements - Lay witness statements
 * @property {boolean} hasPersonalStatement - Veteran's own statement
 * @property {boolean} hasServicePersonnelRecords - DD-214, personnel file
 * @property {boolean} hasDBQ - Disability Benefits Questionnaire completed
 */
export const EVIDENCE_FLAGS = {
  hasServiceTreatmentRecords: {
    id: 'hasServiceTreatmentRecords',
    name: 'Service Treatment Records',
    abbrev: 'STRs',
    description: 'Military medical records from active duty',
    importance: 'critical',
    obtainableBy: 'VA request or veteran submission'
  },
  hasVATreatmentRecords: {
    id: 'hasVATreatmentRecords',
    name: 'VA Treatment Records',
    abbrev: 'VA Records',
    description: 'Records from VA medical facilities',
    importance: 'high',
    obtainableBy: 'VA duty to obtain (38 CFR 3.159(c)(2))'
  },
  hasPrivateMedicalRecords: {
    id: 'hasPrivateMedicalRecords',
    name: 'Private Medical Records',
    abbrev: 'Private Records',
    description: 'Records from non-VA healthcare providers',
    importance: 'high',
    obtainableBy: 'Veteran submission or VA assistance (38 CFR 3.159(c)(1))'
  },
  hasCPExam: {
    id: 'hasCPExam',
    name: 'C&P Examination',
    abbrev: 'C&P Exam',
    description: 'Compensation & Pension examination by VA contractor',
    importance: 'critical',
    obtainableBy: 'VA duty to provide (38 CFR 3.159(c)(4))'
  },
  hasNexusOpinion: {
    id: 'hasNexusOpinion',
    name: 'Nexus Opinion',
    abbrev: 'Nexus',
    description: 'Medical opinion linking condition to service',
    importance: 'critical',
    obtainableBy: 'C&P exam or IMO'
  },
  hasIMO: {
    id: 'hasIMO',
    name: 'Independent Medical Opinion',
    abbrev: 'IMO',
    description: 'Private medical opinion from qualified provider',
    importance: 'high',
    obtainableBy: 'Veteran obtains from private provider'
  },
  hasBuddyStatements: {
    id: 'hasBuddyStatements',
    name: 'Buddy Statements',
    abbrev: 'Buddy Stmt',
    description: 'Lay witness statements from fellow service members',
    importance: 'medium',
    obtainableBy: 'Veteran obtains from witnesses'
  },
  hasPersonalStatement: {
    id: 'hasPersonalStatement',
    name: 'Personal Statement',
    abbrev: 'Personal Stmt',
    description: "Veteran's own statement describing condition/history",
    importance: 'medium',
    obtainableBy: 'Veteran submission'
  },
  hasServicePersonnelRecords: {
    id: 'hasServicePersonnelRecords',
    name: 'Service Personnel Records',
    abbrev: 'Personnel Records',
    description: 'DD-214, awards, duty assignments, disciplinary records',
    importance: 'medium',
    obtainableBy: 'NPRC request or veteran submission'
  },
  hasDBQ: {
    id: 'hasDBQ',
    name: 'Disability Benefits Questionnaire',
    abbrev: 'DBQ',
    description: 'Standardized form documenting disability severity',
    importance: 'high',
    obtainableBy: 'Completed by any licensed provider'
  }
};

/**
 * Claim types under the AMA
 * @readonly
 * @enum {string}
 */
export const CLAIM_TYPES = {
  INITIAL: 'initial',
  INCREASE: 'increase',
  SECONDARY: 'secondary',
  REOPENED: 'reopened',
  CUE: 'cue', // Clear and Unmistakable Error
  TDIU: 'tdiu', // Total Disability Individual Unemployability
  SMC: 'smc' // Special Monthly Compensation
};

/**
 * Common denial reasons with legal references
 */
export const DENIAL_REASONS = {
  NO_CURRENT_DISABILITY: {
    id: 'no_current_disability',
    description: 'No current diagnosis or disability found',
    legalBasis: 'Caluza element 1 not met',
    citation: 'Brammer v. Derwinski, 3 Vet. App. 223 (1992)',
    counterStrategies: [
      'Obtain current diagnosis from qualified provider',
      'Submit medical evidence of current condition',
      'Challenge if condition is intermittent (Ardison v. Brown)'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  },
  NO_IN_SERVICE_EVENT: {
    id: 'no_in_service_event',
    description: 'No evidence of in-service incurrence or aggravation',
    legalBasis: 'Caluza element 2 not met',
    citation: 'Shedden v. Principi, 381 F.3d 1163 (Fed. Cir. 2004)',
    counterStrategies: [
      'Submit buddy statements corroborating event',
      'Request personnel records search',
      'Document MOS-related exposures',
      'Challenge if STRs are incomplete (O\'Hare v. Derwinski)'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  },
  NO_NEXUS: {
    id: 'no_nexus',
    description: 'No medical connection between current condition and service',
    legalBasis: 'Caluza element 3 not met',
    citation: 'Caluza v. Brown, 7 Vet. App. 498 (1995)',
    counterStrategies: [
      'Obtain Independent Medical Opinion (IMO)',
      'Get DBQ with nexus statement',
      'Document continuity of symptoms (38 CFR 3.303(b))'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  },
  NEGATIVE_NEXUS_OPINION: {
    id: 'negative_nexus_opinion',
    description: 'C&P examiner provided negative nexus opinion',
    legalBasis: 'Nexus element addressed but unfavorable',
    citation: 'Nieves-Rodriguez v. Peake, 22 Vet. App. 295 (2008)',
    counterStrategies: [
      'Challenge opinion adequacy under Nieves-Rodriguez',
      'Obtain rebuttal IMO',
      'Identify missing rationale or factual errors'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  },
  NO_EXAM_PROVIDED: {
    id: 'no_exam_provided',
    description: 'VA did not provide C&P examination',
    legalBasis: 'Potential duty to assist violation',
    citation: '38 CFR § 3.159(c)(4); McLendon v. Nicholson',
    counterStrategies: [
      'File HLR citing duty to assist violation',
      'Request exam be provided on remand'
    ],
    recommendedPathway: 'HLR'
  },
  INADEQUATE_EXAM: {
    id: 'inadequate_exam',
    description: 'C&P examination was inadequate',
    legalBasis: 'Exam does not meet regulatory requirements',
    citation: 'Barr v. Nicholson, 21 Vet. App. 303 (2007)',
    counterStrategies: [
      'Document specific inadequacies',
      'Request new examination',
      'Submit IMO addressing inadequacies'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  },
  RATING_TOO_LOW: {
    id: 'rating_too_low',
    description: 'Assigned rating does not reflect disability severity',
    legalBasis: 'Rating criteria misapplied',
    citation: '38 CFR Part 4 (Rating Schedule)',
    counterStrategies: [
      'Document functional impairment per DeLuca',
      'Get DBQ showing higher severity',
      'Challenge diagnostic code selection'
    ],
    recommendedPathway: 'HLR'
  },
  EFFECTIVE_DATE_ERROR: {
    id: 'effective_date_error',
    description: 'Assigned effective date is incorrect',
    legalBasis: 'Effective date provisions not properly applied',
    citation: '38 CFR § 3.400',
    counterStrategies: [
      'Document earlier claim or informal claim',
      'Show facts found date per 38 CFR 3.400(b)(2)'
    ],
    recommendedPathway: 'HLR'
  },
  SECONDARY_NOT_ESTABLISHED: {
    id: 'secondary_not_established',
    description: 'Secondary service connection not established',
    legalBasis: 'No medical evidence of causation or aggravation',
    citation: '38 CFR § 3.310',
    counterStrategies: [
      'Obtain IMO addressing secondary relationship',
      'Document aggravation with baseline severity'
    ],
    recommendedPathway: 'SUPPLEMENTAL'
  }
};

/**
 * Target benefits that can be claimed
 */
export const TARGET_BENEFITS = {
  SERVICE_CONNECTION: {
    id: 'service_connection',
    name: 'Service Connection',
    description: 'Establish service connection for a disability',
    legalBasis: '38 CFR § 3.303'
  },
  INCREASED_RATING: {
    id: 'increased_rating',
    name: 'Increased Rating',
    description: 'Higher disability rating for service-connected condition',
    legalBasis: '38 CFR Part 4'
  },
  SECONDARY_CONNECTION: {
    id: 'secondary_connection',
    name: 'Secondary Service Connection',
    description: 'Condition caused or aggravated by SC disability',
    legalBasis: '38 CFR § 3.310'
  },
  TDIU: {
    id: 'tdiu',
    name: 'Total Disability Individual Unemployability',
    description: 'Unemployable due to service-connected disabilities',
    legalBasis: '38 CFR § 4.16'
  },
  SMC_K: {
    id: 'smc_k',
    name: 'SMC Level K',
    description: 'Loss of use or anatomical loss',
    legalBasis: '38 U.S.C. § 1114(k)'
  },
  SMC_S: {
    id: 'smc_s',
    name: 'SMC Level S (Housebound)',
    description: 'Single 100% plus additional 60% or housebound',
    legalBasis: '38 U.S.C. § 1114(s)'
  },
  SMC_L: {
    id: 'smc_l',
    name: 'SMC Level L (Aid & Attendance)',
    description: 'Need for regular aid and attendance',
    legalBasis: '38 U.S.C. § 1114(l)'
  },
  EARLIER_EFFECTIVE_DATE: {
    id: 'earlier_effective_date',
    name: 'Earlier Effective Date',
    description: 'Correct effective date for benefits',
    legalBasis: '38 CFR § 3.400'
  }
};

/**
 * Complete case data schema for analysis
 * @typedef {Object} CaseData
 */
export const CASE_DATA_SCHEMA = {
  // Veteran Information
  veteran: {
    branchOfService: { type: 'string', required: false },
    mos: { type: 'string', required: false, description: 'Military Occupational Specialty' },
    serviceEra: { type: 'string', required: false, enum: ['vietnam', 'gulf_war', 'oif_oef', 'peacetime', 'other'] },
    combatService: { type: 'boolean', required: false },
    deploymentLocations: { type: 'array', required: false }
  },

  // Claim Details
  claim: {
    condition: { type: 'string', required: true, description: 'Primary condition being claimed' },
    diagnosticCode: { type: 'string', required: false, description: '4-digit DC from rating schedule' },
    claimType: { type: 'string', required: true, enum: Object.values(CLAIM_TYPES) },
    targetBenefit: { type: 'string', required: true, enum: Object.keys(TARGET_BENEFITS) },
    currentRating: { type: 'number', required: false, min: 0, max: 100 },
    soughtRating: { type: 'number', required: false, min: 0, max: 100 }
  },

  // Decision Information
  decision: {
    decisionDate: { type: 'date', required: true },
    denialReasons: { type: 'array', required: false, itemType: 'string', enum: Object.keys(DENIAL_REASONS) },
    decisionText: { type: 'string', required: false, description: 'Key excerpts from decision letter' },
    priorAppeals: { type: 'number', required: false, default: 0 }
  },

  // Evidence Assessment
  evidence: {
    // Evidence existence flags
    ...Object.keys(EVIDENCE_FLAGS).reduce((acc, key) => {
      acc[key] = { type: 'boolean', required: false, default: false };
      return acc;
    }, {}),

    // Evidence quality assessments
    cpExamAdequacy: {
      type: 'object',
      required: false,
      properties: {
        adequate: { type: 'boolean' },
        hasRationale: { type: 'boolean' },
        reviewedRecords: { type: 'boolean' },
        correctSpecialty: { type: 'boolean' },
        addressedHistory: { type: 'boolean' }
      }
    },
    nexusOpinionQuality: {
      type: 'string',
      required: false,
      enum: ['positive', 'negative', 'equivocal', 'no_opinion']
    }
  },

  // VA Procedural Assessment
  procedural: {
    examProvided: { type: 'boolean', required: false },
    vaRecordsObtained: { type: 'boolean', required: false },
    strsObtained: { type: 'boolean', required: false },
    dutyToNotifyMet: { type: 'boolean', required: false },
    benefitOfDoubtApplied: { type: 'boolean', required: false },
    layEvidenceConsidered: { type: 'boolean', required: false }
  },

  // Concessions by VA
  concessions: {
    currentDisabilityConceded: { type: 'boolean', required: false },
    inServiceEventConceded: { type: 'boolean', required: false },
    serviceTreatmentDocumented: { type: 'boolean', required: false },
    continuityEstablished: { type: 'boolean', required: false }
  },

  // Strategic Factors
  strategic: {
    timeSensitivity: { type: 'string', enum: ['critical', 'high', 'moderate', 'low'] },
    evidenceStrength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
    canObtainNewEvidence: { type: 'boolean' },
    hasNewEvidenceAvailable: { type: 'boolean' },
    credibilityAtIssue: { type: 'boolean' },
    complexityLevel: { type: 'string', enum: ['simple', 'moderate', 'complex', 'very_complex'] },
    veteranTestimonyValue: { type: 'string', enum: ['critical', 'helpful', 'neutral', 'not_needed'] }
  }
};

/**
 * Validate case data against schema
 * @param {Object} caseData - Case data to validate
 * @returns {Object} - Validation result with errors array
 */
export function validateCaseData(caseData) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!caseData.claim?.condition) {
    errors.push({ field: 'claim.condition', message: 'Condition is required' });
  }

  if (!caseData.decision?.decisionDate) {
    warnings.push({ field: 'decision.decisionDate', message: 'Decision date not provided - cannot calculate deadlines' });
  }

  // Validate claim type
  if (caseData.claim?.claimType && !Object.values(CLAIM_TYPES).includes(caseData.claim.claimType)) {
    errors.push({ field: 'claim.claimType', message: `Invalid claim type: ${caseData.claim.claimType}` });
  }

  // Check for logical inconsistencies
  if (caseData.evidence?.hasCPExam === false && caseData.evidence?.cpExamAdequacy?.adequate !== undefined) {
    warnings.push({ field: 'evidence', message: 'C&P exam adequacy specified but no exam provided' });
  }

  if (caseData.claim?.claimType === CLAIM_TYPES.SECONDARY && !caseData.claim?.primaryCondition) {
    warnings.push({ field: 'claim', message: 'Secondary claim should specify primary SC condition' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a new case data object with defaults
 * @param {Object} initialData - Initial data to populate
 * @returns {Object} - Case data object with defaults
 */
export function createCaseData(initialData = {}) {
  return {
    veteran: {
      branchOfService: null,
      mos: null,
      serviceEra: null,
      combatService: false,
      deploymentLocations: [],
      ...initialData.veteran
    },
    claim: {
      condition: null,
      diagnosticCode: null,
      claimType: CLAIM_TYPES.INITIAL,
      targetBenefit: 'SERVICE_CONNECTION',
      currentRating: null,
      soughtRating: null,
      ...initialData.claim
    },
    decision: {
      decisionDate: null,
      denialReasons: [],
      decisionText: null,
      priorAppeals: 0,
      ...initialData.decision
    },
    evidence: {
      hasServiceTreatmentRecords: false,
      hasVATreatmentRecords: false,
      hasPrivateMedicalRecords: false,
      hasCPExam: false,
      hasNexusOpinion: false,
      hasIMO: false,
      hasBuddyStatements: false,
      hasPersonalStatement: false,
      hasServicePersonnelRecords: false,
      hasDBQ: false,
      cpExamAdequacy: null,
      nexusOpinionQuality: null,
      ...initialData.evidence
    },
    procedural: {
      examProvided: null,
      vaRecordsObtained: null,
      strsObtained: null,
      dutyToNotifyMet: null,
      benefitOfDoubtApplied: null,
      layEvidenceConsidered: null,
      ...initialData.procedural
    },
    concessions: {
      currentDisabilityConceded: null,
      inServiceEventConceded: null,
      serviceTreatmentDocumented: null,
      continuityEstablished: null,
      ...initialData.concessions
    },
    strategic: {
      timeSensitivity: 'moderate',
      evidenceStrength: 'moderate',
      canObtainNewEvidence: true,
      hasNewEvidenceAvailable: false,
      credibilityAtIssue: false,
      complexityLevel: 'moderate',
      veteranTestimonyValue: 'neutral',
      ...initialData.strategic
    }
  };
}

/**
 * Convert legacy case facts to new schema
 * @param {Object} legacyFacts - Old format case facts
 * @returns {Object} - New format case data
 */
export function convertLegacyFacts(legacyFacts) {
  return createCaseData({
    claim: {
      condition: legacyFacts.condition,
      claimType: legacyFacts.claimType
    },
    decision: {
      decisionDate: legacyFacts.decisionDate
    },
    evidence: {
      hasCPExam: legacyFacts.examProvided,
      hasNexusOpinion: legacyFacts.hasNexusOpinion,
      cpExamAdequacy: legacyFacts.examProvided ? {
        adequate: legacyFacts.examAdequate
      } : null
    },
    procedural: {
      examProvided: legacyFacts.examProvided,
      vaRecordsObtained: legacyFacts.vaRecordsObtained,
      strsObtained: legacyFacts.strsComplete,
      benefitOfDoubtApplied: legacyFacts.benefitOfDoubtApplied,
      layEvidenceConsidered: legacyFacts.layEvidenceConsidered
    },
    concessions: {
      currentDisabilityConceded: legacyFacts.currentDisabilityConceded,
      inServiceEventConceded: legacyFacts.inServiceEventConceded
    },
    strategic: {
      hasNewEvidenceAvailable: legacyFacts.hasNewEvidence,
      canObtainNewEvidence: legacyFacts.canObtainNewEvidence,
      credibilityAtIssue: legacyFacts.credibilityAtIssue
    }
  });
}

export default {
  EVIDENCE_FLAGS,
  CLAIM_TYPES,
  DENIAL_REASONS,
  TARGET_BENEFITS,
  CASE_DATA_SCHEMA,
  validateCaseData,
  createCaseData,
  convertLegacyFacts
};
