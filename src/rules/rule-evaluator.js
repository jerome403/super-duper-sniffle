/**
 * Rule Evaluation Engine
 *
 * Evaluates case facts against legal rules to identify
 * applicable triggers and recommend appeal pathways.
 */

import {
  APPEAL_PATHWAYS,
  getAllTriggers
} from './legal-rules.js';

/**
 * Case facts structure for evaluation
 * @typedef {Object} CaseFacts
 * @property {string} condition - Primary condition being claimed
 * @property {string} claimType - 'initial', 'increase', 'secondary', 'reopened'
 * @property {Date} decisionDate - Date of VA decision
 * @property {boolean} examProvided - Whether C&P exam was provided
 * @property {boolean} examAdequate - Whether exam was adequate
 * @property {boolean} hasNexusOpinion - Whether nexus opinion exists
 * @property {boolean} inServiceEventConceded - Whether VA conceded in-service event
 * @property {boolean} currentDisabilityConceded - Whether VA conceded current disability
 * @property {boolean} vaRecordsObtained - Whether VA records were obtained
 * @property {boolean} strsComplete - Whether service treatment records are complete
 * @property {boolean} layEvidenceConsidered - Whether lay evidence was properly considered
 * @property {boolean} benefitOfDoubtApplied - Whether benefit of doubt was applied
 * @property {boolean} hasNewEvidence - Whether veteran has new evidence available
 * @property {boolean} canObtainNewEvidence - Whether new evidence can be obtained
 * @property {boolean} credibilityAtIssue - Whether veteran credibility is key issue
 * @property {Object} answers - Answers to specific trigger questions
 */

/**
 * Evaluation result for a single trigger
 */
class TriggerEvaluation {
  constructor(trigger, applicable, confidence, reasoning) {
    this.triggerId = trigger.id;
    this.triggerDescription = trigger.description;
    this.ruleId = trigger.ruleId;
    this.ruleName = trigger.ruleName;
    this.citation = trigger.citation;
    this.category = trigger.category;
    this.applicable = applicable;
    this.confidence = confidence;
    this.weight = trigger.weight;
    this.recommendedPathway = trigger.recommendedPathway;
    this.reasoning = reasoning;
    this.questions = trigger.questions || [];
  }

  /**
   * Calculate weighted score for this trigger
   */
  getScore() {
    return this.applicable ? this.weight * this.confidence : 0;
  }
}

/**
 * Pathway recommendation with supporting analysis
 */
class PathwayRecommendation {
  constructor(pathwayId, score, triggers, reasoning) {
    this.pathway = APPEAL_PATHWAYS[pathwayId];
    this.pathwayId = pathwayId;
    this.score = score;
    this.triggers = triggers;
    this.reasoning = reasoning;
    this.rank = 0;
  }
}

/**
 * Complete case evaluation result
 */
class CaseEvaluation {
  constructor() {
    this.triggerEvaluations = [];
    this.pathwayScores = {};
    this.recommendations = [];
    this.primaryRecommendation = null;
    this.warnings = [];
    this.deadlineInfo = null;
  }

  /**
   * Add a trigger evaluation
   */
  addTriggerEvaluation(evaluation) {
    this.triggerEvaluations.push(evaluation);
  }

  /**
   * Calculate pathway scores from trigger evaluations
   */
  calculatePathwayScores() {
    // Initialize scores
    for (const pathwayId of Object.keys(APPEAL_PATHWAYS)) {
      this.pathwayScores[pathwayId] = {
        score: 0,
        triggers: [],
        adjustments: []
      };
    }

    // Accumulate scores from applicable triggers
    for (const evaluation of this.triggerEvaluations) {
      if (evaluation.applicable && evaluation.recommendedPathway) {
        const pathway = this.pathwayScores[evaluation.recommendedPathway];
        if (pathway) {
          pathway.score += evaluation.getScore();
          pathway.triggers.push(evaluation);
        }
      }
    }

    // Apply pathway-specific adjustments
    this.applyPathwayAdjustments();
  }

  /**
   * Apply strategic adjustments based on case characteristics
   */
  applyPathwayAdjustments() {
    // If multiple strong HLR triggers, boost HLR
    const hlrTriggers = this.pathwayScores.HLR?.triggers || [];
    if (hlrTriggers.filter(t => t.weight >= 0.8).length >= 2) {
      this.pathwayScores.HLR.score *= 1.2;
      this.pathwayScores.HLR.adjustments.push('Multiple clear errors boost');
    }

    // If new evidence is critical, boost SUPPLEMENTAL
    const supplementalTriggers = this.pathwayScores.SUPPLEMENTAL?.triggers || [];
    if (supplementalTriggers.some(t => t.triggerId === 'nexus_missing')) {
      this.pathwayScores.SUPPLEMENTAL.score *= 1.3;
      this.pathwayScores.SUPPLEMENTAL.adjustments.push('Missing nexus - new evidence critical');
    }

    // If credibility issues, boost BOARD_HEARING
    const hasCredibilityTrigger = this.triggerEvaluations.some(
      t => t.applicable && t.triggerId === 'lay_evidence_rejected'
    );
    if (hasCredibilityTrigger) {
      this.pathwayScores.BOARD_HEARING.score *= 1.4;
      this.pathwayScores.BOARD_HEARING.adjustments.push('Credibility determination needed');
    }
  }

  /**
   * Generate ranked recommendations
   */
  generateRecommendations() {
    this.recommendations = [];

    for (const [pathwayId, data] of Object.entries(this.pathwayScores)) {
      if (data.score > 0) {
        const reasoning = this.generatePathwayReasoning(pathwayId, data);
        const recommendation = new PathwayRecommendation(
          pathwayId,
          data.score,
          data.triggers,
          reasoning
        );
        this.recommendations.push(recommendation);
      }
    }

    // Sort by score descending
    this.recommendations.sort((a, b) => b.score - a.score);

    // Assign ranks
    this.recommendations.forEach((rec, index) => {
      rec.rank = index + 1;
    });

    // Set primary recommendation
    if (this.recommendations.length > 0) {
      this.primaryRecommendation = this.recommendations[0];
    }
  }

  /**
   * Generate human-readable reasoning for a pathway
   */
  generatePathwayReasoning(pathwayId, data) {
    const pathway = APPEAL_PATHWAYS[pathwayId];
    const reasons = [];

    reasons.push(`${pathway.name} is recommended based on:`);

    for (const trigger of data.triggers) {
      reasons.push(`• ${trigger.citation || trigger.category}: ${trigger.reasoning}`);
    }

    if (data.adjustments.length > 0) {
      reasons.push('\nStrategic considerations:');
      for (const adj of data.adjustments) {
        reasons.push(`• ${adj}`);
      }
    }

    reasons.push(`\nAverage processing time: ${pathway.averageProcessingDays} days`);

    return reasons.join('\n');
  }

  /**
   * Get applicable triggers that need more information
   */
  getUnansweredQuestions() {
    const unanswered = [];

    for (const evaluation of this.triggerEvaluations) {
      if (evaluation.applicable === null && evaluation.questions.length > 0) {
        unanswered.push({
          triggerId: evaluation.triggerId,
          description: evaluation.triggerDescription,
          questions: evaluation.questions,
          ruleName: evaluation.ruleName,
          citation: evaluation.citation
        });
      }
    }

    return unanswered;
  }

  /**
   * Get summary for display
   */
  getSummary() {
    return {
      applicableTriggers: this.triggerEvaluations.filter(t => t.applicable).length,
      totalTriggersEvaluated: this.triggerEvaluations.length,
      primaryRecommendation: this.primaryRecommendation
        ? {
          pathway: this.primaryRecommendation.pathway.name,
          score: this.primaryRecommendation.score.toFixed(2),
          topReasons: this.primaryRecommendation.triggers.slice(0, 3).map(t => t.ruleName)
        }
        : null,
      alternativePathways: this.recommendations.slice(1, 3).map(r => ({
        pathway: r.pathway.name,
        score: r.score.toFixed(2)
      })),
      warnings: this.warnings
    };
  }
}

/**
 * Main rule evaluator class
 */
export class RuleEvaluator {
  constructor() {
    this.triggers = getAllTriggers();
  }

  /**
   * Evaluate case facts against all triggers
   * @param {CaseFacts} facts - Case facts to evaluate
   * @returns {CaseEvaluation} - Complete evaluation result
   */
  evaluate(facts) {
    const evaluation = new CaseEvaluation();

    // Check deadline
    evaluation.deadlineInfo = this.checkDeadlines(facts);

    // Evaluate each trigger
    for (const trigger of this.triggers) {
      const triggerEval = this.evaluateTrigger(trigger, facts);
      evaluation.addTriggerEvaluation(triggerEval);
    }

    // Calculate scores and generate recommendations
    evaluation.calculatePathwayScores();
    evaluation.generateRecommendations();

    // Add warnings
    evaluation.warnings = this.generateWarnings(facts, evaluation);

    return evaluation;
  }

  /**
   * Evaluate a single trigger against case facts
   */
  evaluateTrigger(trigger, facts) {
    const answers = facts.answers || {};

    // Check if we have direct answers for this trigger's questions
    if (answers[trigger.id] !== undefined) {
      return new TriggerEvaluation(
        trigger,
        answers[trigger.id].applicable,
        answers[trigger.id].confidence || 1.0,
        trigger.reasoning
      );
    }

    // Attempt automatic evaluation based on case facts
    const autoEval = this.autoEvaluateTrigger(trigger, facts);
    if (autoEval !== null) {
      return new TriggerEvaluation(
        trigger,
        autoEval.applicable,
        autoEval.confidence,
        trigger.reasoning
      );
    }

    // Can't determine - needs questionnaire
    return new TriggerEvaluation(
      trigger,
      null, // Unknown
      0,
      'Requires additional information'
    );
  }

  /**
   * Attempt automatic evaluation based on available facts
   */
  autoEvaluateTrigger(trigger, facts) {
    switch (trigger.id) {
      case 'no_exam_provided':
        if (facts.examProvided !== undefined) {
          return {
            applicable: !facts.examProvided,
            confidence: 0.95
          };
        }
        break;

      case 'inadequate_exam':
        if (facts.examProvided && facts.examAdequate !== undefined) {
          return {
            applicable: !facts.examAdequate,
            confidence: 0.85
          };
        }
        break;

      case 'nexus_missing':
        if (facts.hasNexusOpinion !== undefined) {
          return {
            applicable: !facts.hasNexusOpinion && facts.currentDisabilityConceded,
            confidence: 0.9
          };
        }
        break;

      case 'missing_va_records':
        if (facts.vaRecordsObtained !== undefined) {
          return {
            applicable: !facts.vaRecordsObtained,
            confidence: 0.9
          };
        }
        break;

      case 'missing_service_records':
        if (facts.strsComplete !== undefined) {
          return {
            applicable: !facts.strsComplete,
            confidence: 0.85
          };
        }
        break;

      case 'in_service_event_denied':
        if (facts.inServiceEventConceded !== undefined) {
          return {
            applicable: !facts.inServiceEventConceded,
            confidence: 0.85
          };
        }
        break;

      case 'lay_evidence_rejected':
        if (facts.layEvidenceConsidered !== undefined) {
          return {
            applicable: !facts.layEvidenceConsidered,
            confidence: 0.7
          };
        }
        break;

      case 'benefit_of_doubt_not_applied':
        if (facts.benefitOfDoubtApplied !== undefined) {
          return {
            applicable: !facts.benefitOfDoubtApplied,
            confidence: 0.7
          };
        }
        break;

      case 'caluza_element_conceded':
        if (facts.currentDisabilityConceded && facts.inServiceEventConceded) {
          return {
            applicable: true,
            confidence: 0.85
          };
        }
        break;
    }

    return null;
  }

  /**
   * Check appeal deadlines
   */
  checkDeadlines(facts) {
    if (!facts.decisionDate) {
      return {
        warning: 'Decision date not provided - cannot calculate deadlines'
      };
    }

    const decisionDate = new Date(facts.decisionDate);
    const now = new Date();
    const daysSinceDecision = Math.floor((now - decisionDate) / (1000 * 60 * 60 * 24));

    const deadlineInfo = {
      decisionDate: decisionDate.toISOString().split('T')[0],
      daysSinceDecision,
      pathwayDeadlines: {}
    };

    // Calculate deadline status for each pathway
    for (const [pathwayId, pathway] of Object.entries(APPEAL_PATHWAYS)) {
      if (pathway.timeLimit) {
        const daysRemaining = pathway.timeLimit - daysSinceDecision;
        deadlineInfo.pathwayDeadlines[pathwayId] = {
          deadline: new Date(decisionDate.getTime() + pathway.timeLimit * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          daysRemaining,
          expired: daysRemaining < 0,
          urgent: daysRemaining > 0 && daysRemaining < 30
        };
      } else {
        deadlineInfo.pathwayDeadlines[pathwayId] = {
          deadline: null,
          daysRemaining: null,
          expired: false,
          urgent: false,
          note: 'No time limit, but filing within 1 year preserves effective date'
        };
      }
    }

    return deadlineInfo;
  }

  /**
   * Generate warnings based on evaluation
   */
  generateWarnings(facts, evaluation) {
    const warnings = [];

    // Deadline warnings
    if (evaluation.deadlineInfo?.pathwayDeadlines) {
      for (const [pathwayId, deadline] of Object.entries(evaluation.deadlineInfo.pathwayDeadlines)) {
        if (deadline.expired) {
          warnings.push({
            type: 'deadline_expired',
            severity: 'high',
            message: `${APPEAL_PATHWAYS[pathwayId].name} deadline has passed`
          });
        } else if (deadline.urgent) {
          warnings.push({
            type: 'deadline_urgent',
            severity: 'high',
            message: `${APPEAL_PATHWAYS[pathwayId].name} deadline in ${deadline.daysRemaining} days`
          });
        }
      }
    }

    // Evidence warnings
    if (evaluation.primaryRecommendation?.pathwayId === 'SUPPLEMENTAL' && !facts.hasNewEvidence && !facts.canObtainNewEvidence) {
      warnings.push({
        type: 'evidence_gap',
        severity: 'medium',
        message: 'Supplemental claim recommended but new evidence availability unclear'
      });
    }

    // Conflicting recommendations
    if (evaluation.recommendations.length >= 2) {
      const [first, second] = evaluation.recommendations;
      if (first.score > 0 && second.score > 0 && (first.score - second.score) / first.score < 0.15) {
        warnings.push({
          type: 'close_call',
          severity: 'info',
          message: `${first.pathway.name} and ${second.pathway.name} are both strong options`
        });
      }
    }

    return warnings;
  }

  /**
   * Get questions for interactive evaluation
   */
  getQuestions() {
    const questions = [];

    for (const trigger of this.triggers) {
      if (trigger.questions && trigger.questions.length > 0) {
        questions.push({
          triggerId: trigger.id,
          triggerDescription: trigger.description,
          ruleName: trigger.ruleName,
          citation: trigger.citation,
          category: trigger.category,
          questions: trigger.questions,
          weight: trigger.weight
        });
      }
    }

    // Sort by weight (most important first)
    questions.sort((a, b) => b.weight - a.weight);

    return questions;
  }
}

export default RuleEvaluator;
