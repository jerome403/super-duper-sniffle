/**
 * Phase 1 Tests - VA Claims Decision-Support Foundation
 *
 * Comprehensive tests for:
 * - Case data schema and models
 * - SMC analysis framework
 * - Colvin violation detection
 * - Professional output formatter
 * - Integration tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Core imports
import { RuleEvaluator } from '../src/rules/rule-evaluator.js';
import { PathwayRecommender } from '../src/recommendation/pathway-recommender.js';
import { getAllRules, getAllTriggers, APPEAL_PATHWAYS } from '../src/rules/legal-rules.js';

// New Phase 1 imports
import { SMCAnalyzer, SMC_LEVELS } from '../src/rules/smc-rules.js';
import { ColvinAnalyzer, COLVIN_VIOLATION_TYPES } from '../src/rules/colvin-analyzer.js';
import { ProfessionalFormatter } from '../src/output/professional-formatter.js';
import {
  DENIAL_REASONS,
  CLAIM_TYPES,
  TARGET_BENEFITS,
  validateCaseData,
  createCaseData,
  convertLegacyFacts
} from '../src/models/case-schema.js';

// API imports
import {
  analyzeCase,
  analyzeSMC,
  analyzeColvin,
  quickColvinCheck,
  generateReport,
  comprehensiveAnalysis
} from '../src/index.js';

// ============================================================
// CASE DATA SCHEMA TESTS
// ============================================================

describe('Case Data Schema', () => {
  it('should have all denial reasons defined', () => {
    assert.ok(DENIAL_REASONS.NO_CURRENT_DISABILITY);
    assert.ok(DENIAL_REASONS.NO_NEXUS);
    assert.ok(DENIAL_REASONS.NO_IN_SERVICE_EVENT);
    assert.ok(DENIAL_REASONS.INADEQUATE_EXAM);

    // Each should have required fields
    const reason = DENIAL_REASONS.NO_NEXUS;
    assert.ok(reason.id);
    assert.ok(reason.description);
    assert.ok(reason.citation);
    assert.ok(reason.counterStrategies.length > 0);
    assert.ok(reason.recommendedPathway);
  });

  it('should have all claim types defined', () => {
    assert.strictEqual(CLAIM_TYPES.INITIAL, 'initial');
    assert.strictEqual(CLAIM_TYPES.INCREASE, 'increase');
    assert.strictEqual(CLAIM_TYPES.SECONDARY, 'secondary');
    assert.strictEqual(CLAIM_TYPES.REOPENED, 'reopened');
    assert.strictEqual(CLAIM_TYPES.TDIU, 'tdiu');
    assert.strictEqual(CLAIM_TYPES.SMC, 'smc');
  });

  it('should have all target benefits defined', () => {
    assert.ok(TARGET_BENEFITS.SERVICE_CONNECTION);
    assert.ok(TARGET_BENEFITS.INCREASED_RATING);
    assert.ok(TARGET_BENEFITS.SECONDARY_CONNECTION);
    assert.ok(TARGET_BENEFITS.TDIU);
    assert.ok(TARGET_BENEFITS.SMC_K);
    assert.ok(TARGET_BENEFITS.SMC_S);
    assert.ok(TARGET_BENEFITS.SMC_L);
  });

  it('should create case data with defaults', () => {
    const caseData = createCaseData({
      claim: { condition: 'tinnitus' }
    });

    assert.strictEqual(caseData.claim.condition, 'tinnitus');
    assert.strictEqual(caseData.claim.claimType, CLAIM_TYPES.INITIAL);
    assert.strictEqual(caseData.evidence.hasCPExam, false);
    assert.strictEqual(caseData.strategic.timeSensitivity, 'moderate');
  });

  it('should validate case data correctly', () => {
    // Valid case
    const validResult = validateCaseData({
      claim: { condition: 'tinnitus' }
    });
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.errors.length, 0);

    // Invalid case - missing condition
    const invalidResult = validateCaseData({
      claim: {}
    });
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors.length > 0);
  });

  it('should convert legacy facts to new schema', () => {
    const legacyFacts = {
      condition: 'sleep apnea',
      claimType: 'secondary',
      examProvided: true,
      examAdequate: false,
      hasNexusOpinion: true,
      currentDisabilityConceded: true
    };

    const converted = convertLegacyFacts(legacyFacts);

    assert.strictEqual(converted.claim.condition, 'sleep apnea');
    assert.strictEqual(converted.claim.claimType, 'secondary');
    assert.strictEqual(converted.evidence.hasCPExam, true);
    assert.strictEqual(converted.evidence.cpExamAdequacy.adequate, false);
    assert.strictEqual(converted.concessions.currentDisabilityConceded, true);
  });
});

// ============================================================
// SMC ANALYSIS TESTS
// ============================================================

describe('SMC Analysis Framework', () => {
  it('should have all SMC levels defined', () => {
    assert.ok(SMC_LEVELS.K);
    assert.ok(SMC_LEVELS.L);
    assert.ok(SMC_LEVELS.M);
    assert.ok(SMC_LEVELS.N);
    assert.ok(SMC_LEVELS.O);
    assert.ok(SMC_LEVELS.R_1);
    assert.ok(SMC_LEVELS.R_2);
    assert.ok(SMC_LEVELS.S);
    assert.ok(SMC_LEVELS.T);
  });

  it('should have proper structure for each SMC level', () => {
    for (const [id, level] of Object.entries(SMC_LEVELS)) {
      assert.ok(level.name, `Level ${id} missing name`);
      assert.ok(level.statute, `Level ${id} missing statute`);
      assert.ok(level.cfr, `Level ${id} missing CFR`);
      assert.ok(level.description, `Level ${id} missing description`);
    }
  });

  it('should analyze SMC-S eligibility with statutory housebound', () => {
    const analyzer = new SMCAnalyzer();

    const result = analyzer.analyze({
      disabilities: [
        { condition: 'PTSD', rating: 100 },
        { condition: 'Back condition', rating: 40 },
        { condition: 'Knee condition', rating: 30 }
      ],
      hasTDIU: false
    });

    // Should identify potential S eligibility
    const sLevel = result.eligibleLevels.find(l => l.level === 'S') ||
      result.potentialLevels.find(l => l.level === 'S');
    assert.ok(sLevel, 'Should identify S level eligibility');
  });

  it('should analyze SMC-K eligibility', () => {
    const analyzer = new SMCAnalyzer();

    const result = analyzer.analyze({
      disabilities: [
        { condition: 'Loss of use of left hand', rating: 70 }
      ],
      smcKConditions: ['Loss of use of left hand']
    });

    const kLevel = result.eligibleLevels.find(l => l.level === 'K');
    assert.ok(kLevel, 'Should identify K level eligibility');
  });

  it('should provide evaluation questions', () => {
    const analyzer = new SMCAnalyzer();
    const questions = analyzer.getEvaluationQuestions();

    assert.ok(Array.isArray(questions));
    assert.ok(questions.length > 0);

    const sQuestions = questions.find(q => q.levelId === 'S');
    assert.ok(sQuestions, 'Should have S level questions');
    assert.ok(sQuestions.questions.length > 0);
  });

  it('should calculate combined rating using VA math', () => {
    const analyzer = new SMCAnalyzer();

    // 50% + 30% should be 65% (rounds to 70)
    const combined = analyzer.calculateCombinedRating([50, 30]);
    assert.strictEqual(combined, 70);

    // 70% + 50% + 30% should be ~87% (rounds to 90)
    const combined2 = analyzer.calculateCombinedRating([70, 50, 30]);
    assert.strictEqual(combined2, 90);
  });
});

// ============================================================
// COLVIN VIOLATION TESTS
// ============================================================

describe('Colvin Violation Detection', () => {
  it('should have all violation types defined', () => {
    assert.ok(COLVIN_VIOLATION_TYPES.REJECTION_WITHOUT_CONTRARY);
    assert.ok(COLVIN_VIOLATION_TYPES.UNSUBSTANTIATED_CONCLUSIONS);
    assert.ok(COLVIN_VIOLATION_TYPES.RATER_MEDICAL_JUDGMENT);
    assert.ok(COLVIN_VIOLATION_TYPES.SPECULATIVE_DENIAL);
  });

  it('should detect rejection without contrary evidence', () => {
    const analyzer = new ColvinAnalyzer();

    const result = analyzer.analyze({
      hasFavorableMedicalOpinion: true,
      claimDenied: true,
      hasContraryMedicalOpinion: false,
      imoSubmitted: true,
      imoRejected: true
    });

    assert.ok(result.indicators.length > 0, 'Should identify indicators');
  });

  it('should detect concerning phrases in decision text', () => {
    const analyzer = new ColvinAnalyzer();

    const result = analyzer.analyze({
      decisionText: 'The condition cannot be related to service. There is no nexus between the current condition and military service.'
    });

    assert.ok(result.phraseMatches.length > 0, 'Should find concerning phrases');

    const strongMatch = result.phraseMatches.find(m => m.type === 'strong');
    assert.ok(strongMatch, 'Should find strong indicator phrases');
  });

  it('should perform quick check correctly', () => {
    const analyzer = new ColvinAnalyzer();

    // Case with likely violation
    const violation = analyzer.quickCheck({
      hasFavorableMedicalOpinion: true,
      claimDenied: true,
      hasContraryMedicalOpinion: false,
      imoSubmitted: true,
      imoRejected: true
    });

    assert.strictEqual(violation.likelyViolation, true);
    assert.ok(violation.redFlags.length > 0);

    // Case without violation indicators
    const noViolation = analyzer.quickCheck({
      hasFavorableMedicalOpinion: false,
      claimDenied: true
    });

    assert.strictEqual(noViolation.likelyViolation, false);
  });

  it('should provide evaluation questions', () => {
    const analyzer = new ColvinAnalyzer();
    const questions = analyzer.getEvaluationQuestions();

    assert.ok(Array.isArray(questions));
    assert.ok(questions.length > 0);

    const favorableQuestion = questions.find(q => q.id === 'favorable_opinion');
    assert.ok(favorableQuestion);
    assert.ok(favorableQuestion.question);
    assert.ok(favorableQuestion.significance);
  });

  it('should generate argument template when violation detected', () => {
    const analyzer = new ColvinAnalyzer();

    const result = analyzer.analyze({
      hasFavorableMedicalOpinion: true,
      claimDenied: true,
      hasContraryMedicalOpinion: false,
      imoSubmitted: true,
      imoRejected: true,
      decisionText: 'The examiner\'s opinion is rejected because the condition cannot be related to service.'
    });

    if (result.hasViolation) {
      assert.ok(result.argumentTemplate, 'Should generate argument template');
      assert.ok(result.argumentTemplate.title);
      assert.ok(result.argumentTemplate.sections.length > 0);
    }
  });
});

// ============================================================
// PROFESSIONAL FORMATTER TESTS
// ============================================================

describe('Professional Output Formatter', () => {
  it('should create formatter with options', () => {
    const formatter = new ProfessionalFormatter({
      outputFormat: 'markdown',
      includeDisclaimer: true
    });

    assert.strictEqual(formatter.options.outputFormat, 'markdown');
    assert.strictEqual(formatter.options.includeDisclaimer, true);
  });

  it('should format recommendation document', () => {
    const recommender = new PathwayRecommender();
    const recommendation = recommender.recommend({
      condition: 'tinnitus',
      facts: {
        examProvided: false,
        currentDisabilityConceded: true
      }
    });

    const formatter = new ProfessionalFormatter();
    const document = formatter.formatRecommendation(recommendation, {
      condition: 'tinnitus'
    });

    assert.ok(document.title);
    assert.ok(document.date);
    assert.ok(document.sections.length > 0);
  });

  it('should render as plain text', () => {
    const recommender = new PathwayRecommender();
    const recommendation = recommender.recommend({
      condition: 'back pain',
      facts: {
        examProvided: true,
        examAdequate: false,
        hasNexusOpinion: false,
        currentDisabilityConceded: true
      }
    });

    const formatter = new ProfessionalFormatter({ outputFormat: 'text' });
    const document = formatter.formatRecommendation(recommendation, {
      condition: 'back pain'
    });
    const output = formatter.render(document);

    assert.ok(typeof output === 'string');
    assert.ok(output.length > 0);
    assert.ok(output.includes('VA CLAIMS'));
  });

  it('should render as markdown', () => {
    const recommender = new PathwayRecommender();
    const recommendation = recommender.recommend({
      condition: 'sleep apnea',
      facts: {
        examProvided: true,
        hasNexusOpinion: false,
        currentDisabilityConceded: true
      }
    });

    const formatter = new ProfessionalFormatter({ outputFormat: 'markdown' });
    const document = formatter.formatRecommendation(recommendation, {
      condition: 'sleep apnea'
    });
    const output = formatter.render(document);

    assert.ok(output.includes('#')); // Markdown headers
    assert.ok(output.includes('**')); // Bold text
  });

  it('should include disclaimer when enabled', () => {
    const formatter = new ProfessionalFormatter({
      includeDisclaimer: true
    });

    const recommender = new PathwayRecommender();
    const recommendation = recommender.recommend({
      condition: 'test',
      facts: {}
    });

    const document = formatter.formatRecommendation(recommendation, { condition: 'test' });

    assert.ok(document.disclaimer);
    assert.ok(document.disclaimer.title);
    assert.ok(document.disclaimer.content.length > 0);
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('Integration Tests', () => {
  it('should perform comprehensive analysis', () => {
    const result = comprehensiveAnalysis({
      condition: 'tinnitus',
      facts: {
        examProvided: true,
        examAdequate: false,
        hasNexusOpinion: false,
        currentDisabilityConceded: true,
        inServiceEventConceded: true,
        decisionDate: '2025-06-15'
      },
      strategicFactors: {
        time_sensitivity: 'high',
        evidence_strength: 'moderate'
      }
    });

    assert.ok(result.recommendation);
    assert.ok(result.colvinAnalysis);
    assert.ok(typeof result.hasColvinViolation === 'boolean');
    assert.ok(typeof result.confidence === 'number');
    assert.ok(Array.isArray(result.warnings));
  });

  it('should generate report from API', () => {
    const caseData = {
      condition: 'PTSD',
      facts: {
        examProvided: true,
        examAdequate: true,
        hasNexusOpinion: false,
        currentDisabilityConceded: true
      }
    };

    const recommendation = analyzeCase(caseData);
    const report = generateReport(recommendation, caseData);

    assert.ok(typeof report === 'string');
    assert.ok(report.length > 0);
  });

  it('should analyze SMC from API', () => {
    const result = analyzeSMC({
      disabilities: [
        { condition: 'PTSD', rating: 100 },
        { condition: 'TBI', rating: 70 }
      ]
    });

    assert.ok(result);
    assert.ok(Array.isArray(result.eligibleLevels));
    assert.ok(Array.isArray(result.potentialLevels));
  });

  it('should analyze Colvin from API', () => {
    const result = analyzeColvin({
      hasFavorableMedicalOpinion: true,
      claimDenied: true,
      hasContraryMedicalOpinion: false
    });

    assert.ok(result);
    assert.ok(typeof result.hasViolation === 'boolean');
    assert.ok(Array.isArray(result.indicators));
  });

  it('should perform quick Colvin check from API', () => {
    const result = quickColvinCheck({
      hasFavorableMedicalOpinion: true,
      claimDenied: true,
      hasContraryMedicalOpinion: false,
      imoSubmitted: true,
      imoRejected: true
    });

    assert.ok(typeof result.likelyViolation === 'boolean');
    assert.ok(Array.isArray(result.redFlags));
  });
});

// ============================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================

describe('Edge Cases', () => {
  it('should handle empty case data gracefully', () => {
    const recommender = new PathwayRecommender();
    const result = recommender.recommend({});

    assert.ok(result);
    // Should not throw
  });

  it('should handle missing facts gracefully', () => {
    const result = analyzeCase({
      condition: 'test'
      // No facts provided
    });

    assert.ok(result);
  });

  it('should handle Colvin analysis with no data', () => {
    const analyzer = new ColvinAnalyzer();
    const result = analyzer.analyze({});

    assert.ok(result);
    assert.strictEqual(result.hasViolation, false);
  });

  it('should handle SMC analysis with no disabilities', () => {
    const analyzer = new SMCAnalyzer();
    const result = analyzer.analyze({});

    assert.ok(result);
    assert.ok(Array.isArray(result.eligibleLevels));
  });

  it('should handle formatter with minimal data', () => {
    const formatter = new ProfessionalFormatter();
    const document = formatter.formatRecommendation({
      primaryPathway: null,
      alternativePathways: [],
      warnings: [],
      actionItems: [],
      confidence: 0
    }, {});

    assert.ok(document);
    const output = formatter.render(document);
    assert.ok(typeof output === 'string');
  });
});
