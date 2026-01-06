/**
 * Colvin Violation Analyzer
 *
 * Detailed analysis for detecting Colvin violations where VA adjudicators
 * improperly substitute their own medical judgment for competent medical evidence.
 *
 * Legal Authority: Colvin v. Derwinski, 1 Vet. App. 171 (1991)
 *
 * Key Holding: "The BVA cannot substitute its own unsubstantiated medical
 * conclusions for that of a medical professional."
 *
 * @module rules/colvin-analyzer
 */

/**
 * Colvin violation types and indicators
 */
export const COLVIN_VIOLATION_TYPES = {
  REJECTION_WITHOUT_CONTRARY: {
    id: 'rejection_without_contrary',
    name: 'Rejection Without Contrary Medical Evidence',
    description: 'VA rejected favorable medical opinion without providing contrary medical evidence',
    severity: 'high',
    citation: 'Colvin v. Derwinski, 1 Vet. App. 171, 175 (1991)',
    indicators: [
      'Favorable medical opinion in record',
      'Decision rejects opinion',
      'No contrary medical opinion cited',
      'Rater provides own medical reasoning'
    ],
    legalStandard: 'Once a favorable medical opinion is submitted, VA cannot reject it without contrary medical evidence',
    remedy: 'HLR or Board appeal - clear legal error'
  },

  UNSUBSTANTIATED_CONCLUSIONS: {
    id: 'unsubstantiated_conclusions',
    name: 'Unsubstantiated Medical Conclusions',
    description: 'VA drew medical conclusions without medical evidence support',
    severity: 'high',
    citation: 'Colvin v. Derwinski, 1 Vet. App. at 175',
    indicators: [
      'Decision makes causation determination',
      'No medical opinion supports conclusion',
      'Uses phrases like "cannot be related" without citation'
    ],
    legalStandard: 'VA adjudicators are not competent to make medical determinations',
    remedy: 'HLR - procedural error'
  },

  LAY_EVIDENCE_AS_MEDICAL: {
    id: 'lay_evidence_as_medical',
    name: 'Treating Lay Evidence as Medical Evidence',
    description: 'VA used non-medical statements to make medical determinations',
    severity: 'medium',
    citation: 'Espiritu v. Derwinski, 2 Vet. App. 492 (1992)',
    indicators: [
      'Decision relies on veteran denial of symptoms',
      'Uses absence of complaints as medical evidence',
      'Treats lay observations as dispositive on medical questions'
    ],
    legalStandard: 'Lay evidence is competent for observable symptoms but not medical causation',
    remedy: 'HLR or Supplemental with medical evidence'
  },

  SPECULATIVE_DENIAL: {
    id: 'speculative_denial',
    name: 'Speculative Denial',
    description: 'VA denied based on speculation rather than evidence',
    severity: 'medium',
    citation: 'Bloom v. West, 12 Vet. App. 185 (1999)',
    indicators: [
      'Decision uses language like "could be" or "might be"',
      'Denial based on possibility rather than probability',
      'No definitive medical opinion'
    ],
    legalStandard: 'Speculation is not sufficient basis for denial',
    remedy: 'HLR citing improper evidentiary standard'
  },

  RATER_MEDICAL_JUDGMENT: {
    id: 'rater_medical_judgment',
    name: 'Rater Substituting Medical Judgment',
    description: 'VA rater made independent medical determinations',
    severity: 'high',
    citation: 'Colvin, 1 Vet. App. at 175',
    indicators: [
      'Rater opines on etiology',
      'Rater interprets medical records differently than examiner',
      'Rater draws conclusions about symptom significance'
    ],
    legalStandard: 'Adjudicators cannot independently assess medical evidence',
    remedy: 'HLR - clear Colvin violation'
  }
};

/**
 * Phrase patterns that indicate potential Colvin violations
 */
export const COLVIN_INDICATOR_PHRASES = [
  {
    pattern: /the (evidence|record) does not (show|establish|demonstrate)/i,
    type: 'potential',
    weight: 0.3,
    explanation: 'May be legitimate if based on absence of required evidence'
  },
  {
    pattern: /cannot be (related|attributed|connected) to/i,
    type: 'strong',
    weight: 0.7,
    explanation: 'Medical causation determination - requires medical evidence'
  },
  {
    pattern: /is not (caused|due|related|attributable) to/i,
    type: 'strong',
    weight: 0.7,
    explanation: 'Negative causation finding without medical support'
  },
  {
    pattern: /there is no (nexus|connection|relationship)/i,
    type: 'strong',
    weight: 0.6,
    explanation: 'Nexus determination must be based on medical evidence'
  },
  {
    pattern: /the condition (is|was) not incurred in/i,
    type: 'potential',
    weight: 0.4,
    explanation: 'May be Colvin if no medical evidence supports'
  },
  {
    pattern: /(unlikely|improbable|not plausible)/i,
    type: 'potential',
    weight: 0.5,
    explanation: 'Probability assessment may require medical expertise'
  },
  {
    pattern: /no (medical|competent) evidence/i,
    type: 'legitimate',
    weight: 0.1,
    explanation: 'May be legitimate finding of evidentiary insufficiency'
  },
  {
    pattern: /in the (rater|adjudicator|examiner|board)('s)? (opinion|view|judgment)/i,
    type: 'strong',
    weight: 0.8,
    explanation: 'Explicit statement of rater opinion on medical matter'
  },
  {
    pattern: /the board (finds|concludes|determines) that/i,
    type: 'potential',
    weight: 0.4,
    explanation: 'May be Colvin if finding is medical in nature'
  },
  {
    pattern: /would not have (caused|resulted|led)/i,
    type: 'strong',
    weight: 0.7,
    explanation: 'Causation determination requiring medical expertise'
  },
  {
    pattern: /more likely (caused|due|attributable) to/i,
    type: 'strong',
    weight: 0.6,
    explanation: 'Alternative causation theory requires medical support'
  },
  {
    pattern: /the examiner('s)? opinion (is|was) (rejected|not persuasive|outweighed)/i,
    type: 'critical',
    weight: 0.9,
    explanation: 'Rejection of medical opinion - must cite contrary medical evidence'
  }
];

/**
 * Analysis result for Colvin violations
 */
export class ColvinAnalysis {
  constructor() {
    this.hasViolation = false;
    this.violationType = null;
    this.confidence = 0;
    this.indicators = [];
    this.phraseMatches = [];
    this.supportingCaseLaw = [];
    this.recommendedAction = null;
    this.argumentTemplate = null;
  }
}

/**
 * Colvin Violation Analyzer
 */
export class ColvinAnalyzer {
  constructor() {
    this.violationTypes = COLVIN_VIOLATION_TYPES;
    this.phrasePatterns = COLVIN_INDICATOR_PHRASES;
  }

  /**
   * Analyze case for Colvin violations
   * @param {Object} caseData - Case data including decision text and evidence
   * @returns {ColvinAnalysis} - Complete Colvin analysis
   */
  analyze(caseData) {
    const analysis = new ColvinAnalysis();

    // Analyze decision text for phrase patterns
    if (caseData.decisionText) {
      analysis.phraseMatches = this.analyzeText(caseData.decisionText);
    }

    // Check structural indicators
    const structuralIndicators = this.checkStructuralIndicators(caseData);
    analysis.indicators.push(...structuralIndicators);

    // Determine violation type
    const violation = this.determineViolationType(analysis, caseData);
    if (violation) {
      analysis.hasViolation = true;
      analysis.violationType = violation;
      analysis.confidence = this.calculateConfidence(analysis);
      analysis.supportingCaseLaw = this.getSupportingCaseLaw(violation);
      analysis.recommendedAction = this.getRecommendedAction(violation);
      analysis.argumentTemplate = this.generateArgumentTemplate(analysis, caseData);
    }

    return analysis;
  }

  /**
   * Analyze decision text for Colvin indicator phrases
   */
  analyzeText(text) {
    const matches = [];

    for (const phrasePattern of this.phrasePatterns) {
      const regex = new RegExp(phrasePattern.pattern, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          phrase: match[0],
          type: phrasePattern.type,
          weight: phrasePattern.weight,
          explanation: phrasePattern.explanation,
          position: match.index,
          context: this.extractContext(text, match.index, 100)
        });
      }
    }

    // Sort by weight descending
    matches.sort((a, b) => b.weight - a.weight);

    return matches;
  }

  /**
   * Extract surrounding context from text
   */
  extractContext(text, position, contextLength) {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  /**
   * Check structural indicators in case data
   */
  checkStructuralIndicators(caseData) {
    const indicators = [];

    // Check if favorable medical opinion was submitted but claim denied
    if (caseData.hasFavorableMedicalOpinion && caseData.claimDenied) {
      indicators.push({
        type: 'structural',
        id: 'favorable_opinion_denied',
        description: 'Favorable medical opinion submitted but claim denied',
        weight: 0.8,
        significantFor: 'rejection_without_contrary'
      });

      // Check if contrary opinion exists
      if (!caseData.hasContraryMedicalOpinion) {
        indicators.push({
          type: 'structural',
          id: 'no_contrary_opinion',
          description: 'No contrary medical opinion to rebut favorable opinion',
          weight: 0.9,
          significantFor: 'rejection_without_contrary'
        });
      }
    }

    // Check if IMO was rejected
    if (caseData.imoSubmitted && caseData.imoRejected) {
      indicators.push({
        type: 'structural',
        id: 'imo_rejected',
        description: 'Independent Medical Opinion was rejected',
        weight: 0.85,
        significantFor: 'rejection_without_contrary'
      });
    }

    // Check if C&P exam was positive but claim denied
    if (caseData.cpExamPositive && caseData.claimDenied) {
      indicators.push({
        type: 'structural',
        id: 'positive_cp_denied',
        description: 'Positive C&P exam opinion but claim denied',
        weight: 0.9,
        significantFor: 'rejection_without_contrary'
      });
    }

    // Check for nexus denial without medical evidence
    if (caseData.denialReasons?.includes('NO_NEXUS') && !caseData.hasNegativeNexusOpinion) {
      indicators.push({
        type: 'structural',
        id: 'nexus_denial_no_opinion',
        description: 'Denied for lack of nexus without negative medical opinion',
        weight: 0.75,
        significantFor: 'unsubstantiated_conclusions'
      });
    }

    return indicators;
  }

  /**
   * Determine the most likely violation type
   */
  determineViolationType(analysis, caseData) {
    // Score each violation type based on indicators
    const scores = {};

    for (const [typeId, violationType] of Object.entries(this.violationTypes)) {
      scores[typeId] = 0;
    }

    // Score from phrase matches
    for (const match of analysis.phraseMatches) {
      if (match.type === 'critical') {
        scores['rejection_without_contrary'] += match.weight;
        scores['rater_medical_judgment'] += match.weight;
      } else if (match.type === 'strong') {
        scores['unsubstantiated_conclusions'] += match.weight * 0.8;
        scores['rater_medical_judgment'] += match.weight * 0.6;
      } else if (match.type === 'potential') {
        scores['speculative_denial'] += match.weight * 0.5;
      }
    }

    // Score from structural indicators
    for (const indicator of analysis.indicators) {
      if (indicator.significantFor) {
        scores[indicator.significantFor] += indicator.weight;
      }
    }

    // Find highest scoring violation type
    let maxScore = 0;
    let maxType = null;

    for (const [typeId, score] of Object.entries(scores)) {
      if (score > maxScore && score >= 0.5) { // Threshold for detection
        maxScore = score;
        maxType = typeId;
      }
    }

    if (maxType) {
      return {
        ...this.violationTypes[maxType],
        score: maxScore
      };
    }

    return null;
  }

  /**
   * Calculate confidence in the Colvin violation finding
   */
  calculateConfidence(analysis) {
    let confidence = 0;

    // Base confidence from violation type score
    if (analysis.violationType?.score) {
      confidence += Math.min(analysis.violationType.score * 0.4, 0.4);
    }

    // Boost for critical phrase matches
    const criticalMatches = analysis.phraseMatches.filter(m => m.type === 'critical');
    confidence += Math.min(criticalMatches.length * 0.15, 0.3);

    // Boost for strong phrase matches
    const strongMatches = analysis.phraseMatches.filter(m => m.type === 'strong');
    confidence += Math.min(strongMatches.length * 0.1, 0.2);

    // Boost for structural indicators
    const highWeightIndicators = analysis.indicators.filter(i => i.weight >= 0.8);
    confidence += Math.min(highWeightIndicators.length * 0.1, 0.2);

    return Math.min(confidence, 0.95);
  }

  /**
   * Get supporting case law for the violation type
   */
  getSupportingCaseLaw(violationType) {
    const baseCases = [
      {
        citation: 'Colvin v. Derwinski, 1 Vet. App. 171 (1991)',
        holding: 'VA cannot substitute its own unsubstantiated medical conclusions for competent medical evidence',
        relevance: 'primary'
      }
    ];

    const additionalCases = {
      'rejection_without_contrary': [
        {
          citation: 'Gabrielson v. Brown, 7 Vet. App. 36, 40 (1994)',
          holding: 'Board must analyze credibility and probative value of evidence',
          relevance: 'supporting'
        },
        {
          citation: 'Madden v. Brown, 125 F.3d 1477, 1481 (Fed. Cir. 1997)',
          holding: 'Board has authority to discount evidence, but must explain',
          relevance: 'supporting'
        }
      ],
      'unsubstantiated_conclusions': [
        {
          citation: 'Stefl v. Nicholson, 21 Vet. App. 120 (2007)',
          holding: 'Medical opinions must be supported by rationale',
          relevance: 'supporting'
        }
      ],
      'speculative_denial': [
        {
          citation: 'Bloom v. West, 12 Vet. App. 185 (1999)',
          holding: 'Speculative medical opinions have no probative value',
          relevance: 'supporting'
        },
        {
          citation: 'Tirpak v. Derwinski, 2 Vet. App. 609 (1992)',
          holding: 'Medical opinion stated in terms of may or might is speculative',
          relevance: 'supporting'
        }
      ]
    };

    return [
      ...baseCases,
      ...(additionalCases[violationType.id] || [])
    ];
  }

  /**
   * Get recommended action for the violation type
   */
  getRecommendedAction(violationType) {
    return {
      pathway: violationType.remedy.includes('HLR') ? 'HLR' : 'SUPPLEMENTAL',
      reasoning: violationType.remedy,
      priority: violationType.severity === 'high' ? 'high' : 'medium',
      successLikelihood: violationType.severity === 'high' ? 'favorable' : 'moderate'
    };
  }

  /**
   * Generate argument template for the Colvin violation
   */
  generateArgumentTemplate(analysis, caseData) {
    const violation = analysis.violationType;

    const template = {
      title: `Argument: ${violation.name}`,
      sections: []
    };

    // Issue statement
    template.sections.push({
      heading: 'Issue',
      content: `Whether the Regional Office committed clear error by ${violation.description.toLowerCase()}.`
    });

    // Legal standard
    template.sections.push({
      heading: 'Legal Standard',
      content: `In ${violation.citation}, the Court held that "${violation.legalStandard}." ${analysis.supportingCaseLaw[0]?.holding || ''}`
    });

    // Factual summary
    const facts = [];
    for (const indicator of analysis.indicators) {
      facts.push(indicator.description);
    }
    template.sections.push({
      heading: 'Facts',
      content: facts.length > 0
        ? `The record reflects the following: ${facts.join('; ')}.`
        : 'The specific facts should be inserted here based on the record.'
    });

    // Analysis
    const analysisPoints = [];
    for (const match of analysis.phraseMatches.slice(0, 3)) {
      analysisPoints.push(`The decision states "${match.phrase}" ${match.explanation.toLowerCase()}.`);
    }
    template.sections.push({
      heading: 'Analysis',
      content: `The decision constitutes a Colvin violation because: ${analysisPoints.join(' ')}`
    });

    // Conclusion
    template.sections.push({
      heading: 'Conclusion',
      content: `Based on the foregoing, the decision should be reversed as it contains clear legal error under ${violation.citation}.`
    });

    return template;
  }

  /**
   * Quick check for likely Colvin violation
   * @param {Object} caseData - Basic case data
   * @returns {Object} - Quick assessment
   */
  quickCheck(caseData) {
    const redFlags = [];

    if (caseData.hasFavorableMedicalOpinion && caseData.claimDenied && !caseData.hasContraryMedicalOpinion) {
      redFlags.push({
        flag: 'Favorable opinion rejected without contrary evidence',
        severity: 'high',
        action: 'Strong HLR candidate citing Colvin'
      });
    }

    if (caseData.imoSubmitted && caseData.imoRejected && !caseData.imoRebutted) {
      redFlags.push({
        flag: 'IMO rejected without rebuttal opinion',
        severity: 'high',
        action: 'HLR with detailed Colvin argument'
      });
    }

    if (caseData.nexusDenied && !caseData.hasNegativeNexusOpinion) {
      redFlags.push({
        flag: 'Nexus denied without negative medical opinion',
        severity: 'medium',
        action: 'Consider HLR or Supplemental with IMO'
      });
    }

    return {
      likelyViolation: redFlags.length > 0,
      confidence: redFlags.some(f => f.severity === 'high') ? 0.8 : 0.5,
      redFlags,
      recommendation: redFlags.length > 0 ? 'Review for Colvin violation' : 'No obvious Colvin indicators'
    };
  }

  /**
   * Get evaluation questions for detecting Colvin violations
   */
  getEvaluationQuestions() {
    return [
      {
        id: 'favorable_opinion',
        question: 'Did you submit a favorable medical opinion (from C&P exam, IMO, or treating physician)?',
        followUp: 'Was this opinion rejected or given reduced weight?',
        significance: 'high'
      },
      {
        id: 'contrary_opinion',
        question: 'Did VA cite a contrary medical opinion when rejecting your evidence?',
        followUp: 'Or did they simply disagree without medical support?',
        significance: 'high'
      },
      {
        id: 'rater_conclusions',
        question: 'Did the decision make statements about causation without citing medical evidence?',
        examples: ['Your condition cannot be related to service', 'There is no nexus'],
        significance: 'high'
      },
      {
        id: 'opinion_rejected',
        question: 'Did the decision say your medical opinion was not persuasive or was outweighed?',
        followUp: 'What reasons were given?',
        significance: 'medium'
      },
      {
        id: 'imo_submitted',
        question: 'Did you submit an Independent Medical Opinion (IMO)?',
        followUp: 'How did VA address it in the decision?',
        significance: 'medium'
      }
    ];
  }
}

export default {
  COLVIN_VIOLATION_TYPES,
  COLVIN_INDICATOR_PHRASES,
  ColvinAnalysis,
  ColvinAnalyzer
};
