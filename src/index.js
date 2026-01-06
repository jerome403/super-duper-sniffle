/**
 * VA Claims Expert System
 *
 * Main entry point and API for programmatic access.
 */

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

/**
 * Simple API for quick recommendations
 */
export function analyzeCase(caseData) {
  const recommender = new PathwayRecommender();
  return recommender.recommend(caseData);
}

/**
 * Get all questions for UI building
 */
export function getQuestions() {
  const evaluator = new RuleEvaluator();
  return evaluator.getQuestions();
}

/**
 * Check deadlines from decision date
 */
export function checkDeadlines(decisionDate) {
  const evaluator = new RuleEvaluator();
  return evaluator.checkDeadlines({ decisionDate });
}
