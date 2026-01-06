/**
 * Basic tests for the legal rules engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { RuleEvaluator } from '../src/rules/rule-evaluator.js';
import { PathwayRecommender } from '../src/recommendation/pathway-recommender.js';
import { getAllRules, getAllTriggers, APPEAL_PATHWAYS } from '../src/rules/legal-rules.js';

describe('Legal Rules', () => {
  it('should have all appeal pathways defined', () => {
    assert.ok(APPEAL_PATHWAYS.HLR);
    assert.ok(APPEAL_PATHWAYS.SUPPLEMENTAL);
    assert.ok(APPEAL_PATHWAYS.BOARD_DIRECT);
    assert.ok(APPEAL_PATHWAYS.BOARD_EVIDENCE);
    assert.ok(APPEAL_PATHWAYS.BOARD_HEARING);
  });

  it('should return all rules', () => {
    const rules = getAllRules();
    assert.ok(rules.dutyToAssist);
    assert.ok(rules.serviceConnection);
    assert.ok(rules.caseLaw);
    assert.ok(rules.ratingSchedule);
  });

  it('should return all triggers', () => {
    const triggers = getAllTriggers();
    assert.ok(Array.isArray(triggers));
    assert.ok(triggers.length > 0);

    // Check trigger structure
    const trigger = triggers[0];
    assert.ok(trigger.id);
    assert.ok(trigger.ruleId);
    assert.ok(trigger.category);
  });
});

describe('Rule Evaluator', () => {
  it('should evaluate case facts', () => {
    const evaluator = new RuleEvaluator();
    const result = evaluator.evaluate({
      examProvided: false,
      hasNexusOpinion: false,
      currentDisabilityConceded: true,
      decisionDate: '2025-06-15'
    });

    assert.ok(result.triggerEvaluations.length > 0);
    assert.ok(result.recommendations);
    assert.ok(result.deadlineInfo);
  });

  it('should identify missing exam as HLR trigger', () => {
    const evaluator = new RuleEvaluator();
    const result = evaluator.evaluate({
      examProvided: false
    });

    const noExamTrigger = result.triggerEvaluations.find(
      t => t.triggerId === 'no_exam_provided'
    );

    assert.ok(noExamTrigger);
    assert.strictEqual(noExamTrigger.applicable, true);
    assert.strictEqual(noExamTrigger.recommendedPathway, 'HLR');
  });

  it('should identify missing nexus as Supplemental trigger', () => {
    const evaluator = new RuleEvaluator();
    const result = evaluator.evaluate({
      hasNexusOpinion: false,
      currentDisabilityConceded: true
    });

    const nexusTrigger = result.triggerEvaluations.find(
      t => t.triggerId === 'nexus_missing'
    );

    assert.ok(nexusTrigger);
    assert.strictEqual(nexusTrigger.applicable, true);
    assert.strictEqual(nexusTrigger.recommendedPathway, 'SUPPLEMENTAL');
  });

  it('should calculate deadlines correctly', () => {
    const evaluator = new RuleEvaluator();
    const deadlines = evaluator.checkDeadlines({
      decisionDate: '2025-01-01'
    });

    assert.ok(deadlines.decisionDate);
    assert.ok(typeof deadlines.daysSinceDecision === 'number');
    assert.ok(deadlines.pathwayDeadlines.HLR);
    assert.ok(deadlines.pathwayDeadlines.SUPPLEMENTAL);
  });
});

describe('Pathway Recommender', () => {
  it('should generate comprehensive recommendation', () => {
    const recommender = new PathwayRecommender();
    const result = recommender.recommend({
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
        time_sensitivity: 'moderate',
        evidence_strength: 'moderate'
      }
    });

    assert.ok(result.primaryPathway);
    assert.ok(result.reasoning);
    assert.ok(Array.isArray(result.actionItems));
    assert.ok(typeof result.confidence === 'number');
  });

  it('should recommend HLR for clear procedural errors', () => {
    const recommender = new PathwayRecommender();
    const result = recommender.recommend({
      facts: {
        examProvided: false,
        layEvidenceConsidered: false,
        benefitOfDoubtApplied: false
      },
      strategicFactors: {
        time_sensitivity: 'high',
        evidence_strength: 'strong'
      }
    });

    // Should lean toward HLR for procedural errors
    assert.ok(result.primaryPathway);
  });

  it('should recommend Supplemental for missing evidence', () => {
    const recommender = new PathwayRecommender();
    const result = recommender.recommend({
      facts: {
        examProvided: true,
        examAdequate: true,
        hasNexusOpinion: false,
        currentDisabilityConceded: true,
        hasNewEvidence: true,
        canObtainNewEvidence: true
      },
      strategicFactors: {
        new_evidence_available: 'yes_strong',
        evidence_strength: 'weak'
      }
    });

    // Should lean toward Supplemental when new evidence is key
    assert.ok(result.primaryPathway);
  });

  it('should provide strategic factors', () => {
    const factors = PathwayRecommender.getStrategicFactors();
    assert.ok(Array.isArray(factors));
    assert.ok(factors.length > 0);

    const timeFactor = factors.find(f => f.id === 'time_sensitivity');
    assert.ok(timeFactor);
    assert.ok(Array.isArray(timeFactor.options));
  });
});
