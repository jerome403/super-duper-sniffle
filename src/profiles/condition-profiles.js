/**
 * Condition Profile Manager
 *
 * Loads and manages condition-specific profiles that contain:
 * - Common denial reasons and counter-strategies
 * - Success/failure patterns from BVA decisions
 * - Related conditions and secondary connections
 */

import { readFile, readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/conditions');

/**
 * Condition Profile class
 */
export class ConditionProfile {
  constructor(data) {
    this.condition = data.condition;
    this.diagnosticCodes = data.diagnosticCodes || [];
    this.ratingCriteria = data.ratingCriteria || {};
    this.maxRating = data.maxRating;
    this.commonDenialReasons = data.commonDenialReasons || [];
    this.keyFactors = data.keyFactors || {};
    this.successPatterns = data.successPatterns || [];
    this.failurePatterns = data.failurePatterns || [];
    this.bvaDecisionPatterns = data.bvaDecisionPatterns || {};
    this.relatedConditions = data.relatedConditions || [];
    this.secondaryTo = data.secondaryTo || [];
    this.canCauseSecondary = data.canCauseSecondary || [];
  }

  /**
   * Get the most likely denial reason based on case facts
   */
  getMostLikelyDenialReason(caseFacts) {
    // Sort by frequency and return most common
    const sorted = [...this.commonDenialReasons].sort((a, b) => b.frequency - a.frequency);
    return sorted[0] || null;
  }

  /**
   * Get recommended pathway based on denial reason
   */
  getRecommendedPathway(denialReason) {
    const reason = this.commonDenialReasons.find(r => r.reason === denialReason);
    return reason?.bestPathway || 'SUPPLEMENTAL';
  }

  /**
   * Get success probability estimate
   */
  estimateSuccessProbability(caseFacts) {
    let baseProb = 0.5;

    // Check for success pattern matches
    for (const pattern of this.successPatterns) {
      // Simple keyword matching for now
      if (this.matchesPattern(pattern, caseFacts)) {
        baseProb = Math.max(baseProb, pattern.successRate);
      }
    }

    // Check for failure pattern matches
    for (const pattern of this.failurePatterns) {
      if (this.matchesPattern(pattern, caseFacts)) {
        baseProb = Math.min(baseProb, 1 - pattern.failureRate);
      }
    }

    return baseProb;
  }

  /**
   * Check if case facts match a pattern (basic implementation)
   */
  matchesPattern(pattern, caseFacts) {
    // This would be enhanced with AI-based matching
    const patternWords = pattern.pattern.toLowerCase().split(/\s+/);
    const factString = JSON.stringify(caseFacts).toLowerCase();

    let matches = 0;
    for (const word of patternWords) {
      if (factString.includes(word)) matches++;
    }

    return matches >= patternWords.length * 0.5;
  }

  /**
   * Get evidence recommendations
   */
  getEvidenceRecommendations() {
    const recommendations = [];

    for (const [factorId, factor] of Object.entries(this.keyFactors)) {
      if (factor.importance === 'critical' || factor.importance === 'high') {
        recommendations.push({
          factor: factor.description,
          importance: factor.importance,
          evidenceTypes: factor.evidence_types || []
        });
      }
    }

    return recommendations;
  }

  /**
   * Get secondary connection opportunities
   */
  getSecondaryOpportunities() {
    return {
      canBeSecondaryTo: this.secondaryTo,
      canCause: this.canCauseSecondary
    };
  }
}

/**
 * Profile Manager for loading and caching profiles
 */
export class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.loaded = false;
  }

  /**
   * Load all profiles from data directory
   */
  async loadAll() {
    if (this.loaded) return;

    try {
      const files = await readdir(DATA_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const content = await readFile(join(DATA_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        const profile = new ConditionProfile(data);
        this.profiles.set(profile.condition.toLowerCase(), profile);
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading profiles:', error.message);
    }
  }

  /**
   * Get profile for a condition
   */
  async getProfile(condition) {
    await this.loadAll();
    const normalized = condition.toLowerCase().replace(/\s+/g, '_');
    return this.profiles.get(normalized) || null;
  }

  /**
   * Get all available conditions
   */
  async listConditions() {
    await this.loadAll();
    return Array.from(this.profiles.keys());
  }

  /**
   * Save a new or updated profile
   */
  async saveProfile(profile) {
    const filename = `${profile.condition.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = join(DATA_DIR, filename);
    await writeFile(filepath, JSON.stringify(profile, null, 2));

    // Update cache
    this.profiles.set(profile.condition.toLowerCase(), new ConditionProfile(profile));
  }

  /**
   * Find conditions related to a given condition
   */
  async findRelatedConditions(condition) {
    const profile = await this.getProfile(condition);
    if (!profile) return [];

    const related = new Set();

    // Add directly related
    for (const cond of profile.relatedConditions) {
      related.add(cond);
    }

    // Add secondary connections
    for (const cond of profile.secondaryTo) {
      related.add(cond);
    }
    for (const cond of profile.canCauseSecondary) {
      related.add(cond);
    }

    return Array.from(related);
  }

  /**
   * Find conditions that can be secondary to a given primary
   */
  async findSecondaryConditions(primaryCondition) {
    await this.loadAll();
    const results = [];

    for (const [name, profile] of this.profiles) {
      if (profile.secondaryTo.some(c =>
        c.toLowerCase().includes(primaryCondition.toLowerCase())
      )) {
        results.push({
          condition: name,
          connection: 'Can be secondary to ' + primaryCondition
        });
      }
    }

    return results;
  }
}

// Default instance
export const profileManager = new ProfileManager();

export default profileManager;
