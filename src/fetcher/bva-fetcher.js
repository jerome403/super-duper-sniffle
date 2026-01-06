/**
 * BVA Decision Fetcher
 *
 * Fetches and parses Board of Veterans' Appeals decisions
 * from public data sources.
 *
 * Data sources:
 * - Board of Veterans' Appeals Public Decision Search
 * - VA FOIA Reading Room
 * - Casetext / Justia (for case citations)
 */

import fetch from 'node-fetch';

/**
 * BVA Decision structure
 */
export class BVADecision {
  constructor(data) {
    this.caseNumber = data.caseNumber;
    this.decisionDate = data.decisionDate;
    this.veteranId = data.veteranId; // Anonymized
    this.issues = data.issues || [];
    this.outcome = data.outcome; // 'granted', 'denied', 'remanded'
    this.judgeId = data.judgeId;
    this.fullText = data.fullText;
    this.citations = data.citations || [];
    this.keyFindings = data.keyFindings || [];
  }

  /**
   * Extract key legal issues from decision text
   */
  extractLegalIssues() {
    const issues = [];

    // Pattern matching for common legal issues
    const patterns = [
      { pattern: /duty to assist/gi, issue: 'duty_to_assist' },
      { pattern: /Colvin/gi, issue: 'colvin_violation' },
      { pattern: /nexus/gi, issue: 'nexus' },
      { pattern: /benefit of the doubt/gi, issue: 'benefit_of_doubt' },
      { pattern: /secondary.*connection/gi, issue: 'secondary_connection' },
      { pattern: /lay evidence/gi, issue: 'lay_evidence' },
      { pattern: /combat veteran/gi, issue: 'combat_veteran' },
      { pattern: /presumptive/gi, issue: 'presumptive_connection' },
      { pattern: /staged rating/gi, issue: 'staged_rating' },
      { pattern: /DeLuca/gi, issue: 'deluca_factors' }
    ];

    for (const { pattern, issue } of patterns) {
      if (pattern.test(this.fullText)) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Extract cited regulations
   */
  extractRegulations() {
    const regulations = [];
    const cfrPattern = /38\s*C\.?F\.?R\.?\s*§?\s*(\d+\.\d+)/gi;

    let match;
    while ((match = cfrPattern.exec(this.fullText)) !== null) {
      regulations.push(`38 CFR ${match[1]}`);
    }

    return [...new Set(regulations)];
  }

  /**
   * Extract case citations
   */
  extractCitations() {
    const citations = [];

    // Vet. App. citations
    const vetAppPattern = /(\w+)\s+v\.\s+(\w+),\s*(\d+)\s+Vet\.\s*App\.\s*(\d+)/gi;
    let match;
    while ((match = vetAppPattern.exec(this.fullText)) !== null) {
      citations.push({
        case: `${match[1]} v. ${match[2]}`,
        cite: `${match[3]} Vet. App. ${match[4]}`,
        type: 'vet_app'
      });
    }

    // Fed. Cir. citations
    const fedCirPattern = /(\w+)\s+v\.\s+(\w+),\s*(\d+)\s+F\.\s*3d\s*(\d+)/gi;
    while ((match = fedCirPattern.exec(this.fullText)) !== null) {
      citations.push({
        case: `${match[1]} v. ${match[2]}`,
        cite: `${match[3]} F.3d ${match[4]}`,
        type: 'fed_cir'
      });
    }

    return citations;
  }
}

/**
 * BVA Search Results
 */
export class BVASearchResults {
  constructor() {
    this.decisions = [];
    this.totalCount = 0;
    this.page = 1;
    this.pageSize = 20;
    this.query = {};
  }

  /**
   * Get grant rate from results
   */
  getGrantRate() {
    if (this.decisions.length === 0) return 0;
    const granted = this.decisions.filter(d => d.outcome === 'granted').length;
    return granted / this.decisions.length;
  }

  /**
   * Get common patterns in granted decisions
   */
  getGrantPatterns() {
    const grantedDecisions = this.decisions.filter(d => d.outcome === 'granted');
    const patterns = {};

    for (const decision of grantedDecisions) {
      const issues = decision.extractLegalIssues();
      for (const issue of issues) {
        patterns[issue] = (patterns[issue] || 0) + 1;
      }
    }

    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ issue, count, frequency: count / grantedDecisions.length }));
  }

  /**
   * Get common patterns in denied decisions
   */
  getDenialPatterns() {
    const deniedDecisions = this.decisions.filter(d => d.outcome === 'denied');
    const patterns = {};

    for (const decision of deniedDecisions) {
      const issues = decision.extractLegalIssues();
      for (const issue of issues) {
        patterns[issue] = (patterns[issue] || 0) + 1;
      }
    }

    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => ({ issue, count, frequency: count / deniedDecisions.length }));
  }
}

/**
 * BVA Decision Fetcher
 */
export class BVAFetcher {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://www.va.gov/vetapp/';
    this.cacheDir = options.cacheDir;
    this.rateLimit = options.rateLimit || 1000; // ms between requests
    this.lastRequest = 0;
  }

  /**
   * Rate limiting helper
   */
  async rateLimit_() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - elapsed));
    }
    this.lastRequest = Date.now();
  }

  /**
   * Search BVA decisions
   *
   * Note: This is a stub implementation. Real implementation would:
   * 1. Query the VA's public decision search
   * 2. Parse HTML/XML results
   * 3. Handle pagination
   *
   * @param {Object} query - Search parameters
   * @returns {BVASearchResults}
   */
  async search(query) {
    await this.rateLimit_();

    const results = new BVASearchResults();
    results.query = query;

    // Stub: Return mock data for development
    // Real implementation would fetch from VA systems
    console.log('BVA Search stub called with:', query);
    console.log('Real implementation would query VA public records');

    return results;
  }

  /**
   * Fetch a specific decision by case number
   *
   * @param {string} caseNumber
   * @returns {BVADecision|null}
   */
  async fetchDecision(caseNumber) {
    await this.rateLimit_();

    // Stub implementation
    console.log(`Fetching decision: ${caseNumber}`);
    console.log('Real implementation would fetch from VA VETAPP database');

    return null;
  }

  /**
   * Fetch decisions for a specific condition
   *
   * @param {string} condition
   * @param {Object} options
   * @returns {BVASearchResults}
   */
  async fetchByCondition(condition, options = {}) {
    const query = {
      issueDescription: condition,
      dateRange: options.dateRange || { start: '2019-01-01' }, // AMA decisions
      outcomeFilter: options.outcomeFilter, // 'granted', 'denied', 'remanded', or null for all
      limit: options.limit || 100
    };

    return this.search(query);
  }

  /**
   * Analyze patterns in decisions for a condition
   *
   * @param {string} condition
   * @returns {Object} Analysis results
   */
  async analyzeCondition(condition) {
    const results = await this.fetchByCondition(condition, { limit: 200 });

    return {
      condition,
      totalDecisions: results.totalCount,
      grantRate: results.getGrantRate(),
      grantPatterns: results.getGrantPatterns(),
      denialPatterns: results.getDenialPatterns(),
      sampleDecisions: {
        granted: results.decisions.filter(d => d.outcome === 'granted').slice(0, 5),
        denied: results.decisions.filter(d => d.outcome === 'denied').slice(0, 5)
      }
    };
  }
}

/**
 * Decision Text Analyzer (for AI integration)
 *
 * This class provides structure for AI-based analysis of decision text.
 * Can be integrated with OpenAI, Claude, or local models.
 */
export class DecisionAnalyzer {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider; // 'openai', 'anthropic', 'local'
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  /**
   * Extract structured information from decision text
   *
   * @param {string} decisionText
   * @returns {Object} Structured analysis
   */
  async analyzeText(decisionText) {
    // Stub: Would send to AI for analysis
    const analysis = {
      outcome: this.detectOutcome(decisionText),
      issues: this.extractIssues(decisionText),
      keyFindings: [],
      successFactors: [],
      failureFactors: [],
      citations: [],
      reasoning: ''
    };

    return analysis;
  }

  /**
   * Simple outcome detection
   */
  detectOutcome(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('appeal is granted') ||
      lowerText.includes('service connection is granted') ||
      lowerText.includes('claim is granted')) {
      return 'granted';
    }

    if (lowerText.includes('appeal is denied') ||
      lowerText.includes('service connection is denied') ||
      lowerText.includes('claim is denied')) {
      return 'denied';
    }

    if (lowerText.includes('remanded') || lowerText.includes('remand')) {
      return 'remanded';
    }

    return 'unknown';
  }

  /**
   * Extract issues from decision text
   */
  extractIssues(text) {
    const issues = [];
    const issuePattern = /(?:entitlement to|claim for|issue of)\s+([^.]+)/gi;

    let match;
    while ((match = issuePattern.exec(text)) !== null) {
      issues.push(match[1].trim());
    }

    return [...new Set(issues)];
  }

  /**
   * Generate prompts for AI analysis
   */
  generateAnalysisPrompt(decisionText) {
    return `Analyze the following BVA decision and extract:
1. The outcome (granted/denied/remanded)
2. The main issues being decided
3. Key factors that led to the decision
4. Legal citations used
5. What evidence was most persuasive
6. What evidence was lacking

Decision text:
${decisionText}

Provide a structured JSON response.`;
  }
}

// Default instances
export const bvaFetcher = new BVAFetcher();
export const decisionAnalyzer = new DecisionAnalyzer();

export default {
  BVAFetcher,
  BVADecision,
  BVASearchResults,
  DecisionAnalyzer,
  bvaFetcher,
  decisionAnalyzer
};
