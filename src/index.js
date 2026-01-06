/**
 * VA Claims Decision-Support System
 *
 * Main entry point and API for programmatic access.
 * Phase 1: Legal Foundation with Decision-Support
 */

// Core Rules Engine
export { RuleEvaluator } from './rules/rule-evaluator.js';
export { PathwayRecommender } from './recommendation/pathway-recommender.js';
export {
  APPEAL_PATHWAYS,
  DUTY_TO_ASSIST_RULES,
  SERVICE_CONNECTION_RULES,
  AID_AND_ATTENDANCE_RULES,
  CASE_LAW_VIOLATIONS,
  RATING_SCHEDULE_RULES,
  TIMING_RULES,
  getAllRules,
  getAllTriggers
} from './rules/legal-rules.js';

// SMC Analysis
export { SMCAnalyzer, SMC_LEVELS, SMCAnalysis } from './rules/smc-rules.js';

// Colvin Violation Detection
export {
  ColvinAnalyzer,
  ColvinAnalysis,
  COLVIN_VIOLATION_TYPES,
  COLVIN_INDICATOR_PHRASES
} from './rules/colvin-analyzer.js';

// Data Models
export {
  EVIDENCE_FLAGS,
  CLAIM_TYPES,
  DENIAL_REASONS,
  TARGET_BENEFITS,
  CASE_DATA_SCHEMA,
  validateCaseData,
  createCaseData,
  convertLegacyFacts
} from './models/case-schema.js';

// Professional Output
export {
  ProfessionalFormatter,
  CitationFormatter,
  DocumentSection,
  RecommendationDocument
} from './output/professional-formatter.js';

import { PathwayRecommender } from './recommendation/pathway-recommender.js';
import { RuleEvaluator } from './rules/rule-evaluator.js';
import { SMCAnalyzer } from './rules/smc-rules.js';
import { ColvinAnalyzer } from './rules/colvin-analyzer.js';
import { ProfessionalFormatter } from './output/professional-formatter.js';

/**
 * Simple API for quick recommendations
 * @param {Object} caseData - Case data object
 * @returns {Object} - Recommendation result
 */
export function analyzeCase(caseData) {
  const recommender = new PathwayRecommender();
  return recommender.recommend(caseData);
}

/**
 * Get all questions for UI building
 * @returns {Array} - Array of question objects
 */
export function getQuestions() {
  const evaluator = new RuleEvaluator();
  return evaluator.getQuestions();
}

/**
 * Check deadlines from decision date
 * @param {string} decisionDate - Decision date in YYYY-MM-DD format
 * @returns {Object} - Deadline information
 */
export function checkDeadlines(decisionDate) {
  const evaluator = new RuleEvaluator();
  return evaluator.checkDeadlines({ decisionDate });
}

/**
 * Analyze case for SMC eligibility
 * @param {Object} caseData - Case data with disabilities
 * @returns {Object} - SMC analysis result
 */
export function analyzeSMC(caseData) {
  const analyzer = new SMCAnalyzer();
  return analyzer.analyze(caseData);
}

/**
 * Check for Colvin violations
 * @param {Object} caseData - Case data with decision info
 * @returns {Object} - Colvin analysis result
 */
export function analyzeColvin(caseData) {
  const analyzer = new ColvinAnalyzer();
  return analyzer.analyze(caseData);
}

/**
 * Quick check for Colvin violation indicators
 * @param {Object} caseData - Basic case data
 * @returns {Object} - Quick check result
 */
export function quickColvinCheck(caseData) {
  const analyzer = new ColvinAnalyzer();
  return analyzer.quickCheck(caseData);
}

/**
 * Generate professional report
 * @param {Object} recommendation - Recommendation from analyzeCase
 * @param {Object} caseData - Original case data
 * @param {Object} options - Formatter options
 * @returns {string} - Formatted report
 */
export function generateReport(recommendation, caseData, options = {}) {
  const formatter = new ProfessionalFormatter(options);
  const document = formatter.formatRecommendation(recommendation, caseData);
  return formatter.render(document);
}

/**
 * Comprehensive analysis combining all analyzers
 * @param {Object} caseData - Complete case data
 * @returns {Object} - Complete analysis result
 */
export function comprehensiveAnalysis(caseData) {
  const recommender = new PathwayRecommender();
  const smcAnalyzer = new SMCAnalyzer();
  const colvinAnalyzer = new ColvinAnalyzer();

  const recommendation = recommender.recommend(caseData);
  const smcAnalysis = caseData.disabilities ? smcAnalyzer.analyze(caseData) : null;
  const colvinAnalysis = colvinAnalyzer.analyze(caseData);

  return {
    recommendation,
    smcAnalysis,
    colvinAnalysis,
    hasColvinViolation: colvinAnalysis.hasViolation,
    eligibleSMCLevels: smcAnalysis?.eligibleLevels || [],
    primaryPathway: recommendation.primaryPathway?.pathway?.name || null,
    confidence: recommendation.confidence,
    actionItems: recommendation.actionItems,
    warnings: [
      ...recommendation.warnings,
      ...(colvinAnalysis.hasViolation ? [{
        type: 'colvin_violation',
        severity: 'high',
        message: `Potential Colvin violation: ${colvinAnalysis.violationType?.name}`
      }] : [])
    ]
  };
}

export default {
  analyzeCase,
  getQuestions,
  checkDeadlines,
  analyzeSMC,
  analyzeColvin,
  quickColvinCheck,
  generateReport,
  comprehensiveAnalysis
};
