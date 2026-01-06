/**
 * Appeal Pathway Recommendation Engine
 *
 * Combines rule evaluation with strategic factors to provide
 * comprehensive appeal pathway recommendations.
 */

import { RuleEvaluator } from '../rules/rule-evaluator.js';
import { APPEAL_PATHWAYS } from '../rules/legal-rules.js';

/**
 * Strategic factors that influence pathway selection
 */
const STRATEGIC_FACTORS = {
  TIME_SENSITIVITY: {
    id: 'time_sensitivity',
    name: 'Time Sensitivity',
    description: 'How important is quick resolution?',
    weights: {
      critical: { HLR: 1.5, SUPPLEMENTAL: 1.2, BOARD_DIRECT: 0.6, BOARD_EVIDENCE: 0.5, BOARD_HEARING: 0.3 },
      high: { HLR: 1.3, SUPPLEMENTAL: 1.1, BOARD_DIRECT: 0.8, BOARD_EVIDENCE: 0.7, BOARD_HEARING: 0.5 },
      moderate: { HLR: 1.0, SUPPLEMENTAL: 1.0, BOARD_DIRECT: 1.0, BOARD_EVIDENCE: 1.0, BOARD_HEARING: 1.0 },
      low: { HLR: 0.9, SUPPLEMENTAL: 0.9, BOARD_DIRECT: 1.1, BOARD_EVIDENCE: 1.1, BOARD_HEARING: 1.2 }
    }
  },
  EVIDENCE_STRENGTH: {
    id: 'evidence_strength',
    name: 'Current Evidence Strength',
    description: 'How strong is existing evidence in the record?',
    weights: {
      strong: { HLR: 1.4, SUPPLEMENTAL: 0.8, BOARD_DIRECT: 1.3, BOARD_EVIDENCE: 0.9, BOARD_HEARING: 1.1 },
      moderate: { HLR: 1.0, SUPPLEMENTAL: 1.1, BOARD_DIRECT: 1.0, BOARD_EVIDENCE: 1.1, BOARD_HEARING: 1.1 },
      weak: { HLR: 0.7, SUPPLEMENTAL: 1.4, BOARD_DIRECT: 0.7, BOARD_EVIDENCE: 1.3, BOARD_HEARING: 1.2 }
    }
  },
  NEW_EVIDENCE_AVAILABLE: {
    id: 'new_evidence_available',
    name: 'New Evidence Availability',
    description: 'Can new supporting evidence be obtained?',
    weights: {
      yes_strong: { HLR: 0.6, SUPPLEMENTAL: 1.5, BOARD_DIRECT: 0.5, BOARD_EVIDENCE: 1.4, BOARD_HEARING: 1.3 },
      yes_moderate: { HLR: 0.8, SUPPLEMENTAL: 1.3, BOARD_DIRECT: 0.7, BOARD_EVIDENCE: 1.2, BOARD_HEARING: 1.1 },
      uncertain: { HLR: 1.0, SUPPLEMENTAL: 1.0, BOARD_DIRECT: 1.0, BOARD_EVIDENCE: 1.0, BOARD_HEARING: 1.0 },
      no: { HLR: 1.3, SUPPLEMENTAL: 0.5, BOARD_DIRECT: 1.2, BOARD_EVIDENCE: 0.6, BOARD_HEARING: 0.9 }
    }
  },
  COMPLEXITY: {
    id: 'complexity',
    name: 'Case Complexity',
    description: 'How complex is the legal/medical issue?',
    weights: {
      simple: { HLR: 1.3, SUPPLEMENTAL: 1.2, BOARD_DIRECT: 0.8, BOARD_EVIDENCE: 0.8, BOARD_HEARING: 0.7 },
      moderate: { HLR: 1.0, SUPPLEMENTAL: 1.0, BOARD_DIRECT: 1.0, BOARD_EVIDENCE: 1.0, BOARD_HEARING: 1.0 },
      complex: { HLR: 0.8, SUPPLEMENTAL: 0.9, BOARD_DIRECT: 1.2, BOARD_EVIDENCE: 1.1, BOARD_HEARING: 1.3 },
      very_complex: { HLR: 0.6, SUPPLEMENTAL: 0.8, BOARD_DIRECT: 1.3, BOARD_EVIDENCE: 1.2, BOARD_HEARING: 1.4 }
    }
  },
  VETERAN_TESTIMONY: {
    id: 'veteran_testimony',
    name: 'Veteran Testimony Value',
    description: 'Would veteran testimony significantly help the case?',
    weights: {
      critical: { HLR: 0.7, SUPPLEMENTAL: 0.8, BOARD_DIRECT: 0.6, BOARD_EVIDENCE: 0.7, BOARD_HEARING: 1.6 },
      helpful: { HLR: 0.9, SUPPLEMENTAL: 0.9, BOARD_DIRECT: 0.8, BOARD_EVIDENCE: 0.9, BOARD_HEARING: 1.3 },
      neutral: { HLR: 1.0, SUPPLEMENTAL: 1.0, BOARD_DIRECT: 1.0, BOARD_EVIDENCE: 1.0, BOARD_HEARING: 1.0 },
      not_needed: { HLR: 1.1, SUPPLEMENTAL: 1.1, BOARD_DIRECT: 1.1, BOARD_EVIDENCE: 1.1, BOARD_HEARING: 0.8 }
    }
  },
  PRIOR_DENIALS: {
    id: 'prior_denials',
    name: 'Prior Denial History',
    description: 'How many times has this claim been denied?',
    weights: {
      first_denial: { HLR: 1.2, SUPPLEMENTAL: 1.1, BOARD_DIRECT: 0.9, BOARD_EVIDENCE: 0.9, BOARD_HEARING: 0.8 },
      second_denial: { HLR: 0.9, SUPPLEMENTAL: 1.2, BOARD_DIRECT: 1.1, BOARD_EVIDENCE: 1.1, BOARD_HEARING: 1.1 },
      multiple_denials: { HLR: 0.7, SUPPLEMENTAL: 1.0, BOARD_DIRECT: 1.2, BOARD_EVIDENCE: 1.2, BOARD_HEARING: 1.3 }
    }
  }
};

/**
 * Condition-specific pathway preferences
 */
const CONDITION_PATHWAY_PREFERENCES = {
  'mental_health': {
    preferredPathways: ['BOARD_HEARING', 'SUPPLEMENTAL'],
    reasoning: 'Mental health claims often benefit from testimony explaining symptoms and impact',
    nexusImportance: 'high'
  },
  'tinnitus': {
    preferredPathways: ['HLR', 'SUPPLEMENTAL'],
    reasoning: 'Tinnitus is subjective and often has clear Colvin violations when denied',
    nexusImportance: 'moderate'
  },
  'back_condition': {
    preferredPathways: ['SUPPLEMENTAL', 'BOARD_EVIDENCE'],
    reasoning: 'Orthopedic conditions benefit from detailed medical documentation',
    nexusImportance: 'high'
  },
  'sleep_apnea': {
    preferredPathways: ['SUPPLEMENTAL', 'BOARD_HEARING'],
    reasoning: 'Sleep apnea nexus often disputed; buddy statements about snoring valuable',
    nexusImportance: 'high'
  },
  'gerd': {
    preferredPathways: ['SUPPLEMENTAL', 'HLR'],
    reasoning: 'GERD secondary claims common; medical nexus usually determinative',
    nexusImportance: 'high'
  },
  'migraines': {
    preferredPathways: ['BOARD_HEARING', 'SUPPLEMENTAL'],
    reasoning: 'Migraine frequency and severity often disputed; testimony helpful',
    nexusImportance: 'moderate'
  },
  'knee_condition': {
    preferredPathways: ['SUPPLEMENTAL', 'HLR'],
    reasoning: 'Orthopedic conditions; DeLuca factors often overlooked',
    nexusImportance: 'moderate'
  }
};

/**
 * Complete recommendation with all supporting information
 */
export class ComprehensiveRecommendation {
  constructor() {
    this.primaryPathway = null;
    this.alternativePathways = [];
    this.ruleBasedAnalysis = null;
    this.strategicFactors = [];
    this.conditionFactors = null;
    this.actionItems = [];
    this.warnings = [];
    this.confidence = 0;
    this.reasoning = '';
  }
}

/**
 * Main pathway recommender class
 */
export class PathwayRecommender {
  constructor() {
    this.ruleEvaluator = new RuleEvaluator();
  }

  /**
   * Generate comprehensive recommendation
   * @param {Object} caseData - Complete case information
   * @returns {ComprehensiveRecommendation}
   */
  recommend(caseData) {
    const recommendation = new ComprehensiveRecommendation();

    // Step 1: Rule-based evaluation
    const ruleEvaluation = this.ruleEvaluator.evaluate(caseData.facts);
    recommendation.ruleBasedAnalysis = ruleEvaluation;

    // Step 2: Apply strategic factors
    const strategicScores = this.applyStrategicFactors(
      ruleEvaluation.pathwayScores,
      caseData.strategicFactors || {}
    );
    recommendation.strategicFactors = caseData.strategicFactors || {};

    // Step 3: Apply condition-specific preferences
    if (caseData.condition) {
      const conditionFactors = this.applyConditionPreferences(
        strategicScores,
        caseData.condition
      );
      recommendation.conditionFactors = conditionFactors;
    }

    // Step 4: Generate final rankings
    const rankedPathways = this.rankPathways(strategicScores);
    recommendation.primaryPathway = rankedPathways[0];
    recommendation.alternativePathways = rankedPathways.slice(1);

    // Step 5: Generate action items
    recommendation.actionItems = this.generateActionItems(
      recommendation.primaryPathway,
      caseData,
      ruleEvaluation
    );

    // Step 6: Calculate confidence and generate reasoning
    recommendation.confidence = this.calculateConfidence(
      recommendation.primaryPathway,
      rankedPathways,
      ruleEvaluation
    );
    recommendation.reasoning = this.generateReasoning(recommendation, caseData);

    // Step 7: Collect warnings
    recommendation.warnings = [
      ...ruleEvaluation.warnings,
      ...this.generateStrategicWarnings(caseData, recommendation)
    ];

    return recommendation;
  }

  /**
   * Apply strategic factor weights to pathway scores
   */
  applyStrategicFactors(pathwayScores, strategicFactors) {
    const adjustedScores = {};

    // Initialize with base scores
    for (const pathwayId of Object.keys(APPEAL_PATHWAYS)) {
      adjustedScores[pathwayId] = {
        baseScore: pathwayScores[pathwayId]?.score || 0,
        adjustedScore: pathwayScores[pathwayId]?.score || 0,
        multipliers: [],
        triggers: pathwayScores[pathwayId]?.triggers || []
      };
    }

    // Apply each strategic factor
    for (const [factorId, factorValue] of Object.entries(strategicFactors)) {
      const factor = STRATEGIC_FACTORS[factorId.toUpperCase()];
      if (factor && factor.weights[factorValue]) {
        const weights = factor.weights[factorValue];
        for (const [pathwayId, multiplier] of Object.entries(weights)) {
          if (adjustedScores[pathwayId]) {
            adjustedScores[pathwayId].adjustedScore *= multiplier;
            adjustedScores[pathwayId].multipliers.push({
              factor: factor.name,
              value: factorValue,
              multiplier
            });
          }
        }
      }
    }

    return adjustedScores;
  }

  /**
   * Apply condition-specific preferences
   */
  applyConditionPreferences(scores, condition) {
    const normalizedCondition = condition.toLowerCase().replace(/\s+/g, '_');
    const preferences = CONDITION_PATHWAY_PREFERENCES[normalizedCondition];

    if (!preferences) {
      return null;
    }

    // Boost preferred pathways
    for (const pathwayId of preferences.preferredPathways) {
      if (scores[pathwayId]) {
        scores[pathwayId].adjustedScore *= 1.15;
        scores[pathwayId].multipliers.push({
          factor: 'Condition-specific preference',
          value: condition,
          multiplier: 1.15
        });
      }
    }

    return preferences;
  }

  /**
   * Rank pathways by final adjusted score
   */
  rankPathways(scores) {
    const ranked = Object.entries(scores)
      .map(([pathwayId, data]) => ({
        pathwayId,
        pathway: APPEAL_PATHWAYS[pathwayId],
        ...data
      }))
      .filter(p => p.adjustedScore > 0)
      .sort((a, b) => b.adjustedScore - a.adjustedScore);

    return ranked;
  }

  /**
   * Generate specific action items for the recommended pathway
   */
  generateActionItems(primaryPathway, caseData, ruleEvaluation) {
    const items = [];

    if (!primaryPathway) {
      items.push({
        priority: 'high',
        action: 'Provide more case information to generate specific recommendations',
        deadline: null
      });
      return items;
    }

    const pathwayId = primaryPathway.pathwayId;

    // Common first steps
    items.push({
      priority: 'high',
      action: 'Obtain copy of rating decision and review the stated reasons',
      deadline: 'Immediately'
    });

    // Pathway-specific actions
    switch (pathwayId) {
      case 'HLR':
        items.push({
          priority: 'high',
          action: 'Complete VA Form 20-0996 (Higher-Level Review)',
          deadline: this.formatDeadline(caseData.facts?.decisionDate, 365)
        });
        items.push({
          priority: 'medium',
          action: 'Prepare informal conference talking points highlighting errors',
          deadline: 'Before submission'
        });
        if (primaryPathway.triggers.some(t => t.triggerId === 'colvin_violation')) {
          items.push({
            priority: 'high',
            action: 'Document Colvin violation - note where VA made medical judgment without medical evidence',
            deadline: 'Before submission'
          });
        }
        break;

      case 'SUPPLEMENTAL':
        items.push({
          priority: 'high',
          action: 'Complete VA Form 20-0995 (Supplemental Claim)',
          deadline: 'Within 1 year to preserve effective date'
        });
        if (primaryPathway.triggers.some(t => t.triggerId === 'nexus_missing')) {
          items.push({
            priority: 'high',
            action: 'Obtain Independent Medical Opinion (IMO) establishing nexus',
            deadline: 'Before filing supplemental'
          });
        }
        items.push({
          priority: 'medium',
          action: 'Gather any new medical records or buddy statements',
          deadline: 'Before submission'
        });
        break;

      case 'BOARD_DIRECT':
      case 'BOARD_EVIDENCE':
      case 'BOARD_HEARING':
        items.push({
          priority: 'high',
          action: 'Complete VA Form 10182 (Notice of Disagreement)',
          deadline: this.formatDeadline(caseData.facts?.decisionDate, 365)
        });
        if (pathwayId === 'BOARD_HEARING') {
          items.push({
            priority: 'medium',
            action: 'Prepare testimony outline focusing on key disputed facts',
            deadline: 'Before hearing scheduled'
          });
          items.push({
            priority: 'medium',
            action: 'Consider retaining accredited representative for hearing',
            deadline: 'Before hearing'
          });
        }
        break;
    }

    // Add evidence-related actions based on triggers
    for (const trigger of primaryPathway.triggers) {
      if (trigger.triggerId === 'inadequate_exam') {
        items.push({
          priority: 'medium',
          action: 'Document C&P exam inadequacies (missing rationale, wrong specialty, etc.)',
          deadline: 'Before filing'
        });
      }
      if (trigger.triggerId === 'lay_evidence_rejected') {
        items.push({
          priority: 'medium',
          action: 'Prepare detailed buddy statements from witnesses',
          deadline: 'Before filing'
        });
      }
    }

    return items;
  }

  /**
   * Format deadline based on decision date
   */
  formatDeadline(decisionDate, days) {
    if (!decisionDate) return `Within ${days} days of decision`;

    const deadline = new Date(decisionDate);
    deadline.setDate(deadline.getDate() + days);
    const now = new Date();
    const daysRemaining = Math.floor((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'DEADLINE PASSED';
    if (daysRemaining < 30) return `${daysRemaining} days remaining (${deadline.toISOString().split('T')[0]})`;
    return deadline.toISOString().split('T')[0];
  }

  /**
   * Calculate confidence in the recommendation
   */
  calculateConfidence(primary, ranked, ruleEvaluation) {
    if (!primary) return 0;

    let confidence = 0.5; // Base confidence

    // Boost for clear winner
    if (ranked.length >= 2) {
      const gap = (primary.adjustedScore - ranked[1].adjustedScore) / primary.adjustedScore;
      confidence += Math.min(gap * 0.3, 0.2);
    }

    // Boost for applicable rules
    const applicableTriggers = ruleEvaluation.triggerEvaluations.filter(t => t.applicable).length;
    confidence += Math.min(applicableTriggers * 0.05, 0.2);

    // Penalty for high-weight triggers
    if (primary.triggers.some(t => t.weight >= 0.9)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(recommendation, caseData) {
    const parts = [];
    const primary = recommendation.primaryPathway;

    if (!primary) {
      return 'Insufficient information to make a recommendation. Please answer the questionnaire.';
    }

    parts.push(`## Recommended Pathway: ${primary.pathway.name}\n`);

    // Rule-based reasons
    if (primary.triggers.length > 0) {
      parts.push('### Legal Basis');
      for (const trigger of primary.triggers.slice(0, 3)) {
        parts.push(`- **${trigger.citation || trigger.ruleName}**: ${trigger.reasoning}`);
      }
      parts.push('');
    }

    // Strategic factors
    if (primary.multipliers.length > 0) {
      parts.push('### Strategic Considerations');
      for (const mult of primary.multipliers) {
        const impact = mult.multiplier > 1 ? 'supports' : 'weighs against';
        parts.push(`- ${mult.factor} (${mult.value}) ${impact} this pathway`);
      }
      parts.push('');
    }

    // Condition-specific
    if (recommendation.conditionFactors) {
      parts.push('### Condition-Specific Factors');
      parts.push(`- ${recommendation.conditionFactors.reasoning}`);
      parts.push('');
    }

    // Processing time
    parts.push('### Timeline');
    parts.push(`- Expected processing: ~${primary.pathway.averageProcessingDays} days`);
    parts.push(`- New evidence allowed: ${primary.pathway.allowsNewEvidence ? 'Yes' : 'No'}`);
    parts.push(`- Hearing available: ${primary.pathway.allowsHearing ? 'Yes' : 'No'}`);

    return parts.join('\n');
  }

  /**
   * Generate strategic warnings
   */
  generateStrategicWarnings(caseData, recommendation) {
    const warnings = [];

    // Warning if no clear winner
    if (recommendation.alternativePathways.length > 0) {
      const primary = recommendation.primaryPathway;
      const second = recommendation.alternativePathways[0];
      if (primary && second && second.adjustedScore / primary.adjustedScore > 0.85) {
        warnings.push({
          type: 'close_decision',
          severity: 'info',
          message: `${second.pathway.name} is also a strong option - consider your specific priorities`
        });
      }
    }

    // Warning for time-sensitive cases
    if (caseData.strategicFactors?.time_sensitivity === 'critical' &&
      recommendation.primaryPathway?.pathwayId?.startsWith('BOARD')) {
      warnings.push({
        type: 'timeline_mismatch',
        severity: 'medium',
        message: 'Board appeal recommended despite time urgency - legal factors strongly favor this path'
      });
    }

    return warnings;
  }

  /**
   * Get available strategic factors for UI
   */
  static getStrategicFactors() {
    return Object.values(STRATEGIC_FACTORS).map(factor => ({
      id: factor.id,
      name: factor.name,
      description: factor.description,
      options: Object.keys(factor.weights)
    }));
  }

  /**
   * Get condition preferences for UI
   */
  static getConditionPreferences() {
    return CONDITION_PATHWAY_PREFERENCES;
  }
}

export default PathwayRecommender;
