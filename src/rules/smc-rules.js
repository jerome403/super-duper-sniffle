/**
 * Special Monthly Compensation (SMC) Analysis Framework
 *
 * Comprehensive rules engine for evaluating SMC eligibility across all levels.
 * SMC provides additional compensation beyond standard schedular ratings.
 *
 * Legal Authority: 38 U.S.C. § 1114; 38 CFR § 3.350
 *
 * @module rules/smc-rules
 */

/**
 * SMC Rate Levels (2024 rates for reference)
 * Rates increase annually - these are for educational/structural purposes
 */
export const SMC_LEVELS = {
  K: {
    id: 'K',
    name: 'SMC-K (Loss of Use)',
    statute: '38 U.S.C. § 1114(k)',
    cfr: '38 CFR § 3.350(a)',
    description: 'Anatomical loss or loss of use of specific body parts/functions',
    monthlyAmount: 131.64, // 2024 rate - for reference only
    canStack: true,
    maxStack: 3,
    requirements: {
      type: 'any_of',
      criteria: [
        'Anatomical loss or loss of use of one hand',
        'Anatomical loss or loss of use of one foot',
        'Anatomical loss of both buttocks',
        'Anatomical loss or loss of use of one or both creative organs',
        'Blindness in one eye (5/200 or less)',
        'Complete organic aphonia',
        'Deafness in both ears requiring hearing aids',
        'Loss of 25% or more of tissue from single breast or both breasts'
      ]
    },
    evaluation: {
      questions: [
        'Has the veteran lost use of a hand or foot?',
        'Is there anatomical loss of any creative organ?',
        'Does the veteran have loss of vision in one eye to 5/200 or less?',
        'Is there complete deafness in both ears?',
        'Has the veteran lost use of a creative organ?'
      ],
      evidenceNeeded: [
        'Medical documentation of anatomical loss',
        'Loss of use determination by C&P examiner',
        'Visual acuity testing showing 5/200 or worse',
        'Audiological evaluation showing bilateral deafness'
      ]
    }
  },

  L: {
    id: 'L',
    name: 'SMC-L (Aid & Attendance)',
    statute: '38 U.S.C. § 1114(l)',
    cfr: '38 CFR § 3.350(b); 38 CFR § 3.352(a)',
    description: 'Need for regular aid and attendance of another person',
    monthlyAmount: 4826.82,
    canStack: false,
    requirements: {
      type: 'any_of',
      criteria: [
        'Anatomical loss or loss of use of both feet',
        'Anatomical loss or loss of use of one hand and one foot',
        'Blind in both eyes with visual acuity 5/200 or less',
        'Permanently bedridden',
        'So helpless as to need regular aid and attendance (38 CFR 3.352(a))'
      ]
    },
    aidAndAttendanceCriteria: {
      citation: '38 CFR § 3.352(a)',
      description: 'Need for A&A established if veteran meets any of the following',
      factors: [
        {
          id: 'inability_dress',
          description: 'Inability to dress or undress oneself',
          weight: 0.2
        },
        {
          id: 'inability_keep_clean',
          description: 'Inability to keep oneself ordinarily clean and presentable',
          weight: 0.2
        },
        {
          id: 'frequent_adjustment',
          description: 'Frequent need of adjustment of prosthetic/orthopedic appliances',
          weight: 0.15
        },
        {
          id: 'inability_feed',
          description: 'Inability to feed oneself through loss of coordination or extreme weakness',
          weight: 0.25
        },
        {
          id: 'inability_toilet',
          description: 'Inability to attend to the wants of nature',
          weight: 0.25
        },
        {
          id: 'incapacity_protect',
          description: 'Incapacity, physical or mental, requiring care to protect from hazards',
          weight: 0.3
        }
      ]
    },
    evaluation: {
      questions: [
        'Does the veteran need help with daily activities (bathing, dressing, eating)?',
        'Is the veteran bedridden due to service-connected disabilities?',
        'Can the veteran protect themselves from ordinary hazards?',
        'Has the veteran lost use of both feet or one hand and one foot?'
      ],
      evidenceNeeded: [
        'Medical statement on need for aid and attendance',
        'VA Form 21-2680 (A&A examination)',
        'Documentation of daily living limitations',
        'Statement from caregiver regarding assistance provided'
      ]
    }
  },

  L_1_2: {
    id: 'L_1_2',
    name: 'SMC-L 1/2 (Intermediate Rate)',
    statute: '38 U.S.C. § 1114(p)',
    cfr: '38 CFR § 3.350(f)',
    description: 'Between L and M, for additional disabilities or complications',
    monthlyAmount: 5074.63,
    requirements: {
      type: 'combination',
      criteria: [
        'Entitled to SMC-L',
        'Additional independent 50% or more disability',
        'Or bilateral deafness rated 10-20% combined with blindness'
      ]
    }
  },

  M: {
    id: 'M',
    name: 'SMC-M (Anatomical Loss)',
    statute: '38 U.S.C. § 1114(m)',
    cfr: '38 CFR § 3.350(c)',
    description: 'Anatomical loss or loss of use of both hands, both legs at or above knee, or combinations',
    monthlyAmount: 5322.44,
    requirements: {
      type: 'any_of',
      criteria: [
        'Anatomical loss or loss of use of both hands',
        'Anatomical loss or loss of use of both legs at or above knee',
        'Anatomical loss of one arm and one leg at or above elbow/knee',
        'Blindness in both eyes having only light perception',
        'Blindness in both eyes leaving so helpless as to need A&A'
      ]
    },
    evaluation: {
      questions: [
        'Has the veteran lost use of both hands?',
        'Has the veteran lost use of both legs at or above the knee?',
        'Is the veteran blind with only light perception?'
      ],
      evidenceNeeded: [
        'Medical evidence of bilateral anatomical loss',
        'Loss of use determination for extremities',
        'Ophthalmological examination showing light perception only'
      ]
    }
  },

  M_1_2: {
    id: 'M_1_2',
    name: 'SMC-M 1/2 (Intermediate Rate)',
    statute: '38 U.S.C. § 1114(p)',
    cfr: '38 CFR § 3.350(f)',
    description: 'Between M and N rates',
    monthlyAmount: 5572.77
  },

  N: {
    id: 'N',
    name: 'SMC-N (Anatomical Loss Plus A&A)',
    statute: '38 U.S.C. § 1114(n)',
    cfr: '38 CFR § 3.350(d)',
    description: 'Anatomical loss combinations with additional A&A need',
    monthlyAmount: 5823.10,
    requirements: {
      type: 'any_of',
      criteria: [
        'Anatomical loss or loss of use of both arms at or above elbow',
        'Anatomical loss of both legs so near hip as to prevent use of prosthesis',
        'Anatomical loss of one arm and one leg so near shoulder/hip as to prevent prosthesis',
        'Anatomical loss of both eyes or blindness without light perception'
      ]
    }
  },

  N_1_2: {
    id: 'N_1_2',
    name: 'SMC-N 1/2 (Intermediate Rate)',
    statute: '38 U.S.C. § 1114(p)',
    cfr: '38 CFR § 3.350(f)',
    description: 'Between N and O rates',
    monthlyAmount: 6156.85
  },

  O: {
    id: 'O',
    name: 'SMC-O (Maximum Rate)',
    statute: '38 U.S.C. § 1114(o)',
    cfr: '38 CFR § 3.350(e)',
    description: 'Combinations resulting in maximum rate',
    monthlyAmount: 6490.59,
    requirements: {
      type: 'any_of',
      criteria: [
        'Multiple anatomical losses totaling above N level',
        'Paralysis of both lower extremities with loss of bladder/bowel control',
        'Helplessness or blindness requiring constant assistance'
      ]
    }
  },

  R_1: {
    id: 'R_1',
    name: 'SMC-R1 (A&A Higher Level)',
    statute: '38 U.S.C. § 1114(r)(1)',
    cfr: '38 CFR § 3.350(h)',
    description: 'Higher level A&A need based on severity',
    monthlyAmount: 8155.09,
    requirements: {
      type: 'all_of',
      criteria: [
        'Entitled to SMC at O or P rate',
        'Need for higher level of A&A based on severity of disabilities',
        'A&A need not provided by nursing home or VA domiciliary'
      ]
    },
    evaluation: {
      questions: [
        'Is the veteran at SMC-O or SMC-P rate?',
        'Does the veteran require higher level care beyond standard A&A?',
        'Is the veteran receiving care outside of a nursing home?'
      ]
    }
  },

  R_2: {
    id: 'R_2',
    name: 'SMC-R2 (A&A Highest Level)',
    statute: '38 U.S.C. § 1114(r)(2)',
    cfr: '38 CFR § 3.350(h)',
    description: 'Highest level of A&A compensation',
    monthlyAmount: 9360.47,
    requirements: {
      type: 'all_of',
      criteria: [
        'Entitled to SMC at O or P rate',
        'Need for highest level of care',
        'Regular need for daily skilled nursing care or supervision'
      ]
    }
  },

  S: {
    id: 'S',
    name: 'SMC-S (Housebound)',
    statute: '38 U.S.C. § 1114(s)',
    cfr: '38 CFR § 3.350(i)',
    description: 'Housebound status or statutory housebound combination',
    monthlyAmount: 4083.11,
    requirements: {
      type: 'any_of',
      criteria: [
        'Single service-connected disability rated 100% AND additional disabilities rated 60% or more',
        'Permanently housebound due to service-connected disabilities'
      ]
    },
    statutoryHousebound: {
      description: 'Automatic entitlement based on ratings (no actual housebound proof needed)',
      requirements: [
        'One disability rated at 100% schedular',
        'Additional disabilities independently rated at 60% or more',
        'TDIU can satisfy the 100% requirement per Bradley v. Peake'
      ],
      keyCase: 'Bradley v. Peake, 22 Vet. App. 280 (2008)'
    },
    factualHousebound: {
      description: 'Actually confined to home due to disabilities',
      requirements: [
        'Substantially confined to dwelling and immediate premises',
        'Due to service-connected disability or disabilities',
        'Reasonably certain to continue throughout lifetime'
      ]
    },
    evaluation: {
      questions: [
        'Does the veteran have a single 100% rated disability?',
        'Does the veteran have additional disabilities totaling 60% or more (independent)?',
        'Is the veteran actually confined to the home?',
        'Has the veteran been granted TDIU?'
      ],
      evidenceNeeded: [
        'Current rating decision showing percentage breakdown',
        'Medical evidence if claiming factual housebound',
        'Statement describing home confinement if applicable'
      ]
    }
  },

  T: {
    id: 'T',
    name: 'SMC-T (Traumatic Brain Injury)',
    statute: '38 U.S.C. § 1114(t)',
    cfr: '38 CFR § 3.350(j)',
    description: 'Residuals of traumatic brain injury requiring assistance',
    monthlyAmount: 4083.11, // Same as S rate
    requirements: {
      type: 'all_of',
      criteria: [
        'Service-connected TBI residuals',
        'Need for aid in transitioning from combative state',
        'Safety of self or others is at risk'
      ]
    },
    evaluation: {
      questions: [
        'Is the veteran service-connected for TBI?',
        'Does the veteran need supervision to ensure safety?',
        'Are there behavioral/cognitive issues requiring assistance?'
      ],
      evidenceNeeded: [
        'TBI diagnosis and service connection',
        'Neuropsychological evaluation',
        'Statement regarding supervision needs'
      ]
    }
  }
};

/**
 * SMC Analysis Result
 */
export class SMCAnalysis {
  constructor() {
    this.eligibleLevels = [];
    this.potentialLevels = [];
    this.currentLevel = null;
    this.highestPossibleLevel = null;
    this.missingEvidence = [];
    this.recommendations = [];
    this.totalPotentialAmount = 0;
  }
}

/**
 * SMC Analyzer - Evaluates eligibility for all SMC levels
 */
export class SMCAnalyzer {
  constructor() {
    this.levels = SMC_LEVELS;
  }

  /**
   * Analyze case for SMC eligibility
   * @param {Object} caseData - Case data including disabilities and ratings
   * @returns {SMCAnalysis} - Complete SMC analysis
   */
  analyze(caseData) {
    const analysis = new SMCAnalysis();

    // Check each SMC level
    for (const [levelId, level] of Object.entries(this.levels)) {
      const eligibility = this.evaluateLevel(levelId, level, caseData);

      if (eligibility.eligible) {
        analysis.eligibleLevels.push({
          level: levelId,
          name: level.name,
          statute: level.statute,
          confidence: eligibility.confidence,
          evidence: eligibility.supportingEvidence,
          amount: level.monthlyAmount
        });
      } else if (eligibility.potential) {
        analysis.potentialLevels.push({
          level: levelId,
          name: level.name,
          statute: level.statute,
          confidence: eligibility.confidence,
          missingEvidence: eligibility.missingEvidence,
          amount: level.monthlyAmount
        });
      }
    }

    // Determine highest level
    analysis.highestPossibleLevel = this.determineHighestLevel(analysis.eligibleLevels);

    // Calculate potential total (including K stacking)
    analysis.totalPotentialAmount = this.calculateTotalAmount(analysis.eligibleLevels);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis, caseData);

    // Collect all missing evidence
    analysis.missingEvidence = this.collectMissingEvidence(analysis);

    return analysis;
  }

  /**
   * Evaluate eligibility for a specific SMC level
   */
  evaluateLevel(levelId, level, caseData) {
    const result = {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: []
    };

    switch (levelId) {
      case 'K':
        return this.evaluateSMCK(caseData);

      case 'S':
        return this.evaluateSMCS(caseData);

      case 'L':
        return this.evaluateSMCL(caseData);

      case 'T':
        return this.evaluateSMCT(caseData);

      default:
        // For higher levels, check if criteria are met
        if (level.requirements) {
          return this.evaluateGenericLevel(level, caseData);
        }
        return result;
    }
  }

  /**
   * Evaluate SMC-K (Loss of Use)
   */
  evaluateSMCK(caseData) {
    const result = {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: [],
      instances: 0 // K can stack up to 3 times
    };

    const smcKConditions = caseData.smcKConditions || [];
    const disabilities = caseData.disabilities || [];

    // Check for documented K-qualifying conditions
    const kQualifyingPatterns = [
      { pattern: /loss of use.*(hand|foot)/i, type: 'extremity' },
      { pattern: /anatomical loss.*(hand|foot)/i, type: 'extremity' },
      { pattern: /amputation/i, type: 'amputation' },
      { pattern: /blindness.*one eye|visual acuity.*5\/200/i, type: 'vision' },
      { pattern: /loss.*creative organ|erectile dysfunction.*total/i, type: 'creative_organ' },
      { pattern: /deafness.*both ears/i, type: 'hearing' }
    ];

    for (const disability of disabilities) {
      const condition = disability.condition?.toLowerCase() || '';

      for (const { pattern, type } of kQualifyingPatterns) {
        if (pattern.test(condition)) {
          result.instances++;
          result.supportingEvidence.push({
            condition: disability.condition,
            type,
            citation: SMC_LEVELS.K.cfr
          });
        }
      }
    }

    // Check explicitly flagged SMC-K conditions
    if (smcKConditions.length > 0) {
      result.instances = Math.max(result.instances, smcKConditions.length);
      result.supportingEvidence.push(...smcKConditions.map(c => ({
        condition: c,
        explicit: true
      })));
    }

    if (result.instances > 0) {
      result.eligible = true;
      result.confidence = 0.9;
    } else if (disabilities.some(d => d.rating >= 30 && /extremity|eye|ear|organ/i.test(d.condition))) {
      result.potential = true;
      result.confidence = 0.5;
      result.missingEvidence.push('Medical documentation of loss of use or anatomical loss');
    }

    return result;
  }

  /**
   * Evaluate SMC-S (Housebound)
   */
  evaluateSMCS(caseData) {
    const result = {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: [],
      pathway: null // 'statutory' or 'factual'
    };

    const disabilities = caseData.disabilities || [];
    const hasTDIU = caseData.hasTDIU || false;
    const isHousebound = caseData.isHousebound || false;
    const combinedRating = caseData.combinedRating || 0;

    // Check statutory housebound (100% + 60%)
    const has100Percent = disabilities.some(d => d.rating === 100) || hasTDIU;

    if (has100Percent) {
      // Calculate remaining disabilities
      const remaining = disabilities.filter(d => d.rating < 100);
      const remainingCombined = this.calculateCombinedRating(remaining.map(d => d.rating));

      if (remainingCombined >= 60) {
        result.eligible = true;
        result.confidence = 0.95;
        result.pathway = 'statutory';
        result.supportingEvidence.push({
          type: 'statutory_housebound',
          has100: true,
          additional60: remainingCombined,
          citation: 'Bradley v. Peake, 22 Vet. App. 280 (2008)'
        });
      } else if (remainingCombined >= 40) {
        result.potential = true;
        result.confidence = 0.6;
        result.missingEvidence.push(`Additional disabilities to reach 60% (currently ${remainingCombined}%)`);
      }
    }

    // Check factual housebound
    if (isHousebound && !result.eligible) {
      result.potential = true;
      result.confidence = 0.7;
      result.pathway = 'factual';
      result.supportingEvidence.push({
        type: 'factual_housebound',
        selfReported: true
      });
      result.missingEvidence.push('Medical evidence of housebound status');
    }

    return result;
  }

  /**
   * Evaluate SMC-L (Aid & Attendance)
   */
  evaluateSMCL(caseData) {
    const result = {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: []
    };

    const aaNeeds = caseData.aidAndAttendance || {};
    const disabilities = caseData.disabilities || [];

    // Check for qualifying anatomical losses
    const hasDoubleExtremityLoss = disabilities.some(d =>
      /loss of use.*(both feet|both hands|one hand.*one foot)/i.test(d.condition || '')
    );

    if (hasDoubleExtremityLoss) {
      result.eligible = true;
      result.confidence = 0.9;
      result.supportingEvidence.push({
        type: 'anatomical_loss',
        citation: SMC_LEVELS.L.cfr
      });
      return result;
    }

    // Check A&A criteria under 38 CFR 3.352(a)
    const aaCriteria = SMC_LEVELS.L.aidAndAttendanceCriteria.factors;
    let aaScore = 0;
    const metCriteria = [];

    for (const criterion of aaCriteria) {
      if (aaNeeds[criterion.id]) {
        aaScore += criterion.weight;
        metCriteria.push(criterion.description);
      }
    }

    if (aaScore >= 0.3 || metCriteria.length >= 2) {
      result.eligible = true;
      result.confidence = Math.min(0.5 + aaScore, 0.9);
      result.supportingEvidence.push({
        type: 'aid_and_attendance',
        criteriamet: metCriteria,
        citation: '38 CFR § 3.352(a)'
      });
    } else if (aaScore > 0 || caseData.needsAAHelp) {
      result.potential = true;
      result.confidence = 0.5;
      result.missingEvidence.push('VA Form 21-2680 (A&A examination)');
      result.missingEvidence.push('Medical documentation of ADL limitations');
    }

    return result;
  }

  /**
   * Evaluate SMC-T (TBI)
   */
  evaluateSMCT(caseData) {
    const result = {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: []
    };

    const disabilities = caseData.disabilities || [];
    const hasTBI = disabilities.some(d => /traumatic brain injury|tbi/i.test(d.condition || ''));
    const needsSupervision = caseData.needsTBISupervision || false;

    if (hasTBI && needsSupervision) {
      result.eligible = true;
      result.confidence = 0.8;
      result.supportingEvidence.push({
        type: 'tbi_supervision',
        citation: SMC_LEVELS.T.cfr
      });
    } else if (hasTBI) {
      result.potential = true;
      result.confidence = 0.5;
      result.missingEvidence.push('Documentation of supervision needs for TBI');
    }

    return result;
  }

  /**
   * Evaluate generic SMC level based on requirements
   */
  evaluateGenericLevel(level, caseData) {
    return {
      eligible: false,
      potential: false,
      confidence: 0,
      supportingEvidence: [],
      missingEvidence: [`Evaluation for ${level.name} requires specialized review`]
    };
  }

  /**
   * Calculate combined rating using VA math
   */
  calculateCombinedRating(ratings) {
    if (ratings.length === 0) return 0;

    // Sort descending
    const sorted = [...ratings].sort((a, b) => b - a);

    let combined = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const remaining = 100 - combined;
      combined = combined + (remaining * sorted[i] / 100);
    }

    // Round to nearest 10
    return Math.round(combined / 10) * 10;
  }

  /**
   * Determine highest eligible level
   */
  determineHighestLevel(eligibleLevels) {
    const hierarchy = ['K', 'S', 'T', 'L', 'L_1_2', 'M', 'M_1_2', 'N', 'N_1_2', 'O', 'R_1', 'R_2'];

    let highest = null;
    let highestIndex = -1;

    for (const eligible of eligibleLevels) {
      const index = hierarchy.indexOf(eligible.level);
      if (index > highestIndex) {
        highestIndex = index;
        highest = eligible;
      }
    }

    return highest;
  }

  /**
   * Calculate total monthly amount including K stacking
   */
  calculateTotalAmount(eligibleLevels) {
    let total = 0;
    let kInstances = 0;

    for (const level of eligibleLevels) {
      if (level.level === 'K') {
        kInstances = Math.min(level.instances || 1, 3);
        total += SMC_LEVELS.K.monthlyAmount * kInstances;
      } else {
        // Only count highest non-K level
        if (level.amount > total - (SMC_LEVELS.K.monthlyAmount * kInstances)) {
          total = level.amount + (SMC_LEVELS.K.monthlyAmount * kInstances);
        }
      }
    }

    return total;
  }

  /**
   * Generate SMC recommendations
   */
  generateRecommendations(analysis, caseData) {
    const recommendations = [];

    // If eligible for K, note stacking possibility
    const kEligible = analysis.eligibleLevels.find(l => l.level === 'K');
    if (kEligible && kEligible.instances < 3) {
      recommendations.push({
        priority: 'medium',
        type: 'smc_k_stacking',
        message: `SMC-K can stack up to 3 times. Currently eligible for ${kEligible.instances}. Review for additional qualifying losses.`,
        citation: SMC_LEVELS.K.statute
      });
    }

    // If potential S, recommend pursuing
    const sPotential = analysis.potentialLevels.find(l => l.level === 'S');
    if (sPotential) {
      recommendations.push({
        priority: 'high',
        type: 'smc_s_potential',
        message: 'Potential SMC-S (housebound) eligibility. ' + sPotential.missingEvidence.join('. '),
        citation: SMC_LEVELS.S.statute
      });
    }

    // If potential L, recommend A&A exam
    const lPotential = analysis.potentialLevels.find(l => l.level === 'L');
    if (lPotential) {
      recommendations.push({
        priority: 'high',
        type: 'smc_l_potential',
        message: 'Potential SMC-L (Aid & Attendance) eligibility. Request VA Form 21-2680 examination.',
        citation: SMC_LEVELS.L.statute
      });
    }

    return recommendations;
  }

  /**
   * Collect all missing evidence across potential levels
   */
  collectMissingEvidence(analysis) {
    const missing = new Set();

    for (const potential of analysis.potentialLevels) {
      for (const evidence of potential.missingEvidence) {
        missing.add(evidence);
      }
    }

    return [...missing];
  }

  /**
   * Get questions for SMC evaluation
   */
  getEvaluationQuestions() {
    const questions = [];

    for (const [levelId, level] of Object.entries(this.levels)) {
      if (level.evaluation?.questions) {
        questions.push({
          levelId,
          levelName: level.name,
          questions: level.evaluation.questions,
          evidenceNeeded: level.evaluation.evidenceNeeded
        });
      }
    }

    return questions;
  }
}

export default {
  SMC_LEVELS,
  SMCAnalysis,
  SMCAnalyzer
};
