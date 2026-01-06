/**
 * Professional Output Formatter
 *
 * Generates professionally formatted legal analysis documents with proper
 * citations, structured recommendations, and actionable guidance.
 *
 * @module output/professional-formatter
 */

import { APPEAL_PATHWAYS } from '../rules/legal-rules.js';
import { DENIAL_REASONS, TARGET_BENEFITS } from '../models/case-schema.js';

/**
 * Citation formatter for legal references
 */
export const CitationFormatter = {
  /**
   * Format CFR citation
   */
  cfr(title, section) {
    return `${title} C.F.R. § ${section}`;
  },

  /**
   * Format USC citation
   */
  usc(title, section) {
    return `${title} U.S.C. § ${section}`;
  },

  /**
   * Format case citation
   */
  caselaw(name, volume, reporter, page, year, court = '') {
    const courtStr = court ? ` (${court} ${year})` : ` (${year})`;
    return `${name}, ${volume} ${reporter} ${page}${courtStr}`;
  },

  /**
   * Format standard VA case citation
   */
  vetApp(name, volume, page, year) {
    return this.caselaw(name, volume, 'Vet. App.', page, year);
  },

  /**
   * Format Federal Circuit citation
   */
  fedCir(name, volume, page, year) {
    return this.caselaw(name, volume, 'F.3d', page, year, 'Fed. Cir.');
  }
};

/**
 * Professional document section
 */
export class DocumentSection {
  constructor(title, content, citations = []) {
    this.title = title;
    this.content = content;
    this.citations = citations;
    this.subsections = [];
  }

  addSubsection(title, content, citations = []) {
    this.subsections.push(new DocumentSection(title, content, citations));
    return this;
  }
}

/**
 * Professional recommendation document
 */
export class RecommendationDocument {
  constructor() {
    this.title = 'VA Claims Analysis and Recommendation';
    this.date = new Date().toISOString().split('T')[0];
    this.caseReference = null;
    this.executiveSummary = null;
    this.sections = [];
    this.appendices = [];
    this.disclaimer = null;
  }

  addSection(section) {
    this.sections.push(section);
    return this;
  }

  addAppendix(title, content) {
    this.appendices.push({ title, content });
    return this;
  }
}

/**
 * Professional Output Formatter
 */
export class ProfessionalFormatter {
  constructor(options = {}) {
    this.options = {
      includeDisclaimer: true,
      includeTimestamps: true,
      citationStyle: 'bluebook',
      outputFormat: 'text', // 'text', 'markdown', 'html'
      ...options
    };
  }

  /**
   * Format complete recommendation
   * @param {Object} recommendation - Recommendation from PathwayRecommender
   * @param {Object} caseData - Original case data
   * @returns {RecommendationDocument} - Formatted document
   */
  formatRecommendation(recommendation, caseData) {
    const doc = new RecommendationDocument();

    // Set case reference
    doc.caseReference = {
      condition: caseData.claim?.condition || caseData.condition,
      claimType: caseData.claim?.claimType || caseData.claimType,
      analysisDate: doc.date
    };

    // Executive Summary
    doc.executiveSummary = this.formatExecutiveSummary(recommendation, caseData);

    // Recommended Pathway
    doc.addSection(this.formatPathwaySection(recommendation));

    // Legal Analysis
    doc.addSection(this.formatLegalAnalysis(recommendation));

    // Duty to Assist Analysis
    if (recommendation.ruleBasedAnalysis?.triggerEvaluations) {
      doc.addSection(this.formatDutyToAssistAnalysis(recommendation.ruleBasedAnalysis));
    }

    // Procedural Errors
    const proceduralSection = this.formatProceduralErrors(recommendation);
    if (proceduralSection) {
      doc.addSection(proceduralSection);
    }

    // Evidence Assessment
    doc.addSection(this.formatEvidenceAssessment(caseData, recommendation));

    // Action Items
    doc.addSection(this.formatActionItems(recommendation));

    // Timeline and Deadlines
    doc.addSection(this.formatTimeline(recommendation, caseData));

    // Appendices
    doc.addAppendix('Legal Citations', this.formatCitationsAppendix(recommendation));
    doc.addAppendix('Appeal Pathways Reference', this.formatPathwaysReference());

    // Disclaimer
    if (this.options.includeDisclaimer) {
      doc.disclaimer = this.getDisclaimer();
    }

    return doc;
  }

  /**
   * Format executive summary
   */
  formatExecutiveSummary(recommendation, caseData) {
    const primary = recommendation.primaryPathway;

    return {
      recommendation: primary ? primary.pathway.name : 'Further evaluation needed',
      confidence: `${(recommendation.confidence * 100).toFixed(0)}%`,
      condition: caseData.claim?.condition || caseData.condition,
      primaryIssue: this.identifyPrimaryIssue(recommendation),
      urgency: this.assessUrgency(recommendation, caseData),
      keyFindings: this.extractKeyFindings(recommendation)
    };
  }

  /**
   * Identify the primary issue driving the recommendation
   */
  identifyPrimaryIssue(recommendation) {
    const triggers = recommendation.primaryPathway?.triggers || [];

    if (triggers.length === 0) {
      return 'General appeal strategy evaluation';
    }

    const topTrigger = triggers[0];
    return topTrigger.triggerDescription || topTrigger.ruleName || 'Multiple issues identified';
  }

  /**
   * Assess urgency based on deadlines and case factors
   */
  assessUrgency(recommendation, caseData) {
    const deadlines = recommendation.ruleBasedAnalysis?.deadlineInfo?.pathwayDeadlines || {};

    for (const [pathwayId, deadline] of Object.entries(deadlines)) {
      if (deadline.expired) {
        return {
          level: 'critical',
          message: `${APPEAL_PATHWAYS[pathwayId].name} deadline has passed`
        };
      }
      if (deadline.urgent) {
        return {
          level: 'high',
          message: `${deadline.daysRemaining} days until ${APPEAL_PATHWAYS[pathwayId].name} deadline`
        };
      }
    }

    return {
      level: 'normal',
      message: 'Standard timeline applies'
    };
  }

  /**
   * Extract key findings from recommendation
   */
  extractKeyFindings(recommendation) {
    const findings = [];

    // Add trigger-based findings
    const triggers = recommendation.primaryPathway?.triggers || [];
    for (const trigger of triggers.slice(0, 3)) {
      findings.push({
        type: 'legal_issue',
        description: trigger.triggerDescription || trigger.ruleName,
        citation: trigger.citation,
        impact: 'high'
      });
    }

    // Add warnings as findings
    for (const warning of recommendation.warnings.slice(0, 2)) {
      findings.push({
        type: 'warning',
        description: warning.message,
        impact: warning.severity
      });
    }

    return findings;
  }

  /**
   * Format recommended pathway section
   */
  formatPathwaySection(recommendation) {
    const primary = recommendation.primaryPathway;

    if (!primary) {
      return new DocumentSection(
        'Recommended Appeal Pathway',
        'Additional information needed to make a specific recommendation.',
        []
      );
    }

    const section = new DocumentSection(
      'Recommended Appeal Pathway',
      null,
      [primary.pathway.name]
    );

    section.addSubsection(
      'Primary Recommendation',
      {
        pathway: primary.pathway.name,
        description: primary.pathway.description,
        confidence: `${(recommendation.confidence * 100).toFixed(0)}% confidence`,
        processingTime: `Average ${primary.pathway.averageProcessingDays} days`,
        features: {
          allowsNewEvidence: primary.pathway.allowsNewEvidence,
          allowsHearing: primary.pathway.allowsHearing,
          timeLimit: primary.pathway.timeLimit ? `${primary.pathway.timeLimit} days` : 'None'
        }
      }
    );

    // Add alternatives
    if (recommendation.alternativePathways.length > 0) {
      const alternatives = recommendation.alternativePathways.slice(0, 2).map(alt => ({
        pathway: alt.pathway.name,
        relativeScore: primary.adjustedScore > 0
          ? `${((alt.adjustedScore / primary.adjustedScore) * 100).toFixed(0)}% relative strength`
          : 'Viable alternative',
        bestFor: alt.pathway.bestFor.slice(0, 2)
      }));

      section.addSubsection('Alternative Pathways', alternatives);
    }

    return section;
  }

  /**
   * Format legal analysis section
   */
  formatLegalAnalysis(recommendation) {
    const section = new DocumentSection('Legal Analysis', null, []);

    const triggers = recommendation.primaryPathway?.triggers || [];

    if (triggers.length === 0) {
      section.content = 'No specific legal issues identified from available information.';
      return section;
    }

    for (const trigger of triggers) {
      const citations = [];
      if (trigger.citation) citations.push(trigger.citation);

      section.addSubsection(
        trigger.ruleName || trigger.category,
        {
          issue: trigger.triggerDescription,
          legalBasis: trigger.citation,
          analysis: trigger.reasoning,
          recommendation: `Supports ${APPEAL_PATHWAYS[trigger.recommendedPathway]?.name || trigger.recommendedPathway}`
        },
        citations
      );
    }

    return section;
  }

  /**
   * Format duty to assist analysis
   */
  formatDutyToAssistAnalysis(ruleAnalysis) {
    const section = new DocumentSection(
      'Duty to Assist Analysis',
      'Analysis of VA compliance with 38 C.F.R. § 3.159',
      ['38 C.F.R. § 3.159']
    );

    const dtaViolations = ruleAnalysis.triggerEvaluations.filter(
      t => t.applicable && t.category === 'dutyToAssist'
    );

    if (dtaViolations.length === 0) {
      section.content = 'No clear duty to assist violations identified.';
      return section;
    }

    for (const violation of dtaViolations) {
      section.addSubsection(
        violation.citation || 'Duty to Assist',
        {
          violation: violation.triggerDescription,
          requirement: violation.ruleName,
          remedy: violation.reasoning
        },
        [violation.citation]
      );
    }

    return section;
  }

  /**
   * Format procedural errors section
   */
  formatProceduralErrors(recommendation) {
    const triggers = recommendation.ruleBasedAnalysis?.triggerEvaluations || [];
    const proceduralErrors = triggers.filter(
      t => t.applicable && ['caseLaw', 'ratingSchedule'].includes(t.category)
    );

    if (proceduralErrors.length === 0) {
      return null;
    }

    const section = new DocumentSection('Procedural Errors Identified', null, []);

    for (const error of proceduralErrors) {
      section.addSubsection(
        error.ruleName,
        {
          error: error.triggerDescription,
          legalBasis: error.citation,
          significance: `Weight: ${(error.weight * 100).toFixed(0)}%`,
          remedy: error.reasoning
        },
        [error.citation]
      );
    }

    return section;
  }

  /**
   * Format evidence assessment
   */
  formatEvidenceAssessment(caseData, recommendation) {
    const section = new DocumentSection('Evidence Assessment', null, []);

    // Current evidence
    const currentEvidence = [];
    const missingEvidence = [];

    const evidenceMap = {
      hasCPExam: 'C&P Examination',
      hasNexusOpinion: 'Nexus Opinion',
      hasIMO: 'Independent Medical Opinion',
      hasBuddyStatements: 'Buddy Statements',
      hasServiceTreatmentRecords: 'Service Treatment Records',
      hasVATreatmentRecords: 'VA Treatment Records'
    };

    const evidence = caseData.evidence || caseData.facts || caseData;

    for (const [key, label] of Object.entries(evidenceMap)) {
      if (evidence[key] === true) {
        currentEvidence.push(label);
      } else if (evidence[key] === false) {
        missingEvidence.push(label);
      }
    }

    section.addSubsection('Evidence in Record', {
      present: currentEvidence,
      missing: missingEvidence
    });

    // Evidence recommendations
    const primary = recommendation.primaryPathway;
    if (primary && primary.pathway.allowsNewEvidence) {
      section.addSubsection('Evidence Recommendations', {
        note: `${primary.pathway.name} allows new evidence submission`,
        suggestions: [
          'Independent Medical Opinion (IMO) with nexus',
          'Updated medical records',
          'Buddy statements from fellow service members',
          'Personal statement describing impact'
        ]
      });
    }

    return section;
  }

  /**
   * Format action items section
   */
  formatActionItems(recommendation) {
    const section = new DocumentSection('Action Items', null, []);

    const items = recommendation.actionItems || [];

    if (items.length === 0) {
      section.content = 'Action items will be determined based on additional case review.';
      return section;
    }

    // Group by priority
    const byPriority = {
      high: items.filter(i => i.priority === 'high'),
      medium: items.filter(i => i.priority === 'medium'),
      low: items.filter(i => i.priority === 'low' || !i.priority)
    };

    if (byPriority.high.length > 0) {
      section.addSubsection('Immediate Actions (High Priority)', byPriority.high.map(i => ({
        action: i.action,
        deadline: i.deadline || 'As soon as possible'
      })));
    }

    if (byPriority.medium.length > 0) {
      section.addSubsection('Important Actions (Medium Priority)', byPriority.medium.map(i => ({
        action: i.action,
        deadline: i.deadline || 'Before filing'
      })));
    }

    if (byPriority.low.length > 0) {
      section.addSubsection('Additional Actions', byPriority.low.map(i => ({
        action: i.action,
        deadline: i.deadline
      })));
    }

    return section;
  }

  /**
   * Format timeline section
   */
  formatTimeline(recommendation, caseData) {
    const section = new DocumentSection('Timeline and Deadlines', null, []);

    const deadlineInfo = recommendation.ruleBasedAnalysis?.deadlineInfo;

    if (!deadlineInfo || !deadlineInfo.pathwayDeadlines) {
      section.content = 'Provide decision date to calculate specific deadlines.';
      return section;
    }

    section.addSubsection('Decision Information', {
      decisionDate: deadlineInfo.decisionDate,
      daysSinceDecision: deadlineInfo.daysSinceDecision
    });

    const pathwayDeadlines = [];
    for (const [pathwayId, info] of Object.entries(deadlineInfo.pathwayDeadlines || {})) {
      const pathway = APPEAL_PATHWAYS[pathwayId];
      pathwayDeadlines.push({
        pathway: pathway.name,
        deadline: info.deadline || 'No time limit',
        status: info.expired ? 'EXPIRED' : info.urgent ? 'URGENT' : 'Available',
        daysRemaining: info.daysRemaining,
        note: info.note
      });
    }

    section.addSubsection('Appeal Deadlines', pathwayDeadlines);

    // Processing time expectations
    if (recommendation.primaryPathway) {
      section.addSubsection('Expected Timeline', {
        pathway: recommendation.primaryPathway.pathway.name,
        averageProcessing: `${recommendation.primaryPathway.pathway.averageProcessingDays} days`,
        note: 'Processing times vary and are not guaranteed'
      });
    }

    return section;
  }

  /**
   * Format citations appendix
   */
  formatCitationsAppendix(recommendation) {
    const citations = new Set();

    // Collect all citations
    const triggers = recommendation.ruleBasedAnalysis?.triggerEvaluations || [];
    for (const trigger of triggers) {
      if (trigger.citation) {
        citations.add(trigger.citation);
      }
    }

    // Add standard citations
    citations.add('38 C.F.R. § 3.159 (Duty to Assist)');
    citations.add('38 C.F.R. § 3.303 (Service Connection)');

    return {
      regulations: [...citations].filter(c => c.includes('C.F.R.')),
      caseLaw: [...citations].filter(c => !c.includes('C.F.R.'))
    };
  }

  /**
   * Format pathways reference appendix
   */
  formatPathwaysReference() {
    const reference = [];

    for (const [id, pathway] of Object.entries(APPEAL_PATHWAYS)) {
      reference.push({
        id,
        name: pathway.name,
        description: pathway.description,
        timeLimit: pathway.timeLimit ? `${pathway.timeLimit} days` : 'None',
        allowsNewEvidence: pathway.allowsNewEvidence ? 'Yes' : 'No',
        allowsHearing: pathway.allowsHearing ? 'Yes' : 'No',
        averageProcessing: `${pathway.averageProcessingDays} days`,
        bestFor: pathway.bestFor
      });
    }

    return reference;
  }

  /**
   * Get legal disclaimer
   */
  getDisclaimer() {
    return {
      title: 'Important Disclaimer',
      content: `This analysis is provided for informational and educational purposes only and does not constitute legal advice. The information provided should not be relied upon as a substitute for consultation with a qualified attorney or accredited Veterans Service Organization (VSO) representative.

Every case is unique, and the outcome of any appeal depends on the specific facts and evidence presented. The recommendations provided are based on the information available and general legal principles, but cannot guarantee any particular outcome.

Veterans are encouraged to:
1. Consult with an accredited representative (VSO, attorney, or claims agent)
2. Review all documents with qualified counsel
3. Verify all deadlines with the VA directly
4. Maintain copies of all correspondence

This tool is designed to assist in understanding options, not to replace professional legal guidance.`
    };
  }

  /**
   * Render document to specified format
   */
  render(document, format = null) {
    const outputFormat = format || this.options.outputFormat;

    switch (outputFormat) {
      case 'markdown':
        return this.renderMarkdown(document);
      case 'html':
        return this.renderHTML(document);
      case 'text':
      default:
        return this.renderText(document);
    }
  }

  /**
   * Render document as plain text
   */
  renderText(document) {
    const lines = [];
    const separator = '═'.repeat(70);
    const subSeparator = '─'.repeat(50);

    // Title
    lines.push(separator);
    lines.push(`  ${document.title.toUpperCase()}`);
    lines.push(`  Generated: ${document.date}`);
    lines.push(separator);
    lines.push('');

    // Executive Summary
    if (document.executiveSummary) {
      lines.push('EXECUTIVE SUMMARY');
      lines.push(subSeparator);
      const summary = document.executiveSummary;
      lines.push(`Recommendation: ${summary.recommendation}`);
      lines.push(`Confidence: ${summary.confidence}`);
      lines.push(`Condition: ${summary.condition}`);
      lines.push(`Primary Issue: ${summary.primaryIssue}`);
      lines.push(`Urgency: ${summary.urgency.level.toUpperCase()} - ${summary.urgency.message}`);
      lines.push('');

      if (summary.keyFindings.length > 0) {
        lines.push('Key Findings:');
        for (const finding of summary.keyFindings) {
          lines.push(`  • ${finding.description}`);
          if (finding.citation) {
            lines.push(`    Citation: ${finding.citation}`);
          }
        }
        lines.push('');
      }
    }

    // Sections
    for (const section of document.sections) {
      lines.push(section.title.toUpperCase());
      lines.push(subSeparator);

      if (section.citations.length > 0) {
        lines.push(`[${section.citations.join('; ')}]`);
      }

      if (section.content) {
        if (typeof section.content === 'string') {
          lines.push(section.content);
        } else {
          lines.push(this.renderObject(section.content, 0));
        }
      }

      for (const subsection of section.subsections) {
        lines.push('');
        lines.push(`  ${subsection.title}`);
        if (subsection.citations.length > 0) {
          lines.push(`  [${subsection.citations.join('; ')}]`);
        }
        if (typeof subsection.content === 'string') {
          lines.push(`  ${subsection.content}`);
        } else {
          lines.push(this.renderObject(subsection.content, 2));
        }
      }

      lines.push('');
    }

    // Disclaimer
    if (document.disclaimer) {
      lines.push(separator);
      lines.push(document.disclaimer.title.toUpperCase());
      lines.push(subSeparator);
      lines.push(document.disclaimer.content);
      lines.push(separator);
    }

    return lines.join('\n');
  }

  /**
   * Render object as indented text
   */
  renderObject(obj, indent = 0) {
    const lines = [];
    const prefix = '  '.repeat(indent);

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object') {
          lines.push(this.renderObject(item, indent));
          lines.push('');
        } else {
          lines.push(`${prefix}• ${item}`);
        }
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        if (typeof value === 'object' && value !== null) {
          lines.push(`${prefix}${label}:`);
          lines.push(this.renderObject(value, indent + 1));
        } else {
          lines.push(`${prefix}${label}: ${value}`);
        }
      }
    } else {
      lines.push(`${prefix}${obj}`);
    }

    return lines.join('\n');
  }

  /**
   * Render document as Markdown
   */
  renderMarkdown(document) {
    const lines = [];

    lines.push(`# ${document.title}`);
    lines.push(`*Generated: ${document.date}*`);
    lines.push('');

    // Executive Summary
    if (document.executiveSummary) {
      lines.push('## Executive Summary');
      const s = document.executiveSummary;
      lines.push(`| Field | Value |`);
      lines.push(`|-------|-------|`);
      lines.push(`| **Recommendation** | ${s.recommendation} |`);
      lines.push(`| **Confidence** | ${s.confidence} |`);
      lines.push(`| **Condition** | ${s.condition} |`);
      lines.push(`| **Urgency** | ${s.urgency.level.toUpperCase()}: ${s.urgency.message} |`);
      lines.push('');

      if (s.keyFindings.length > 0) {
        lines.push('### Key Findings');
        for (const f of s.keyFindings) {
          lines.push(`- **${f.type}**: ${f.description}`);
          if (f.citation) lines.push(`  - *${f.citation}*`);
        }
        lines.push('');
      }
    }

    // Sections
    for (const section of document.sections) {
      lines.push(`## ${section.title}`);
      if (section.citations.length > 0) {
        lines.push(`*Citations: ${section.citations.join('; ')}*`);
      }
      lines.push('');

      if (section.content) {
        if (typeof section.content === 'string') {
          lines.push(section.content);
        } else {
          lines.push(this.renderMarkdownObject(section.content));
        }
        lines.push('');
      }

      for (const sub of section.subsections) {
        lines.push(`### ${sub.title}`);
        if (sub.citations.length > 0) {
          lines.push(`*${sub.citations.join('; ')}*`);
        }
        if (typeof sub.content === 'string') {
          lines.push(sub.content);
        } else {
          lines.push(this.renderMarkdownObject(sub.content));
        }
        lines.push('');
      }
    }

    // Disclaimer
    if (document.disclaimer) {
      lines.push('---');
      lines.push(`## ${document.disclaimer.title}`);
      lines.push(document.disclaimer.content);
    }

    return lines.join('\n');
  }

  /**
   * Render object as Markdown
   */
  renderMarkdownObject(obj) {
    const lines = [];

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object') {
          for (const [k, v] of Object.entries(item)) {
            lines.push(`- **${k}**: ${v}`);
          }
          lines.push('');
        } else {
          lines.push(`- ${item}`);
        }
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`**${key}**:`);
          lines.push(this.renderMarkdownObject(value));
        } else {
          lines.push(`- **${key}**: ${value}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Render document as HTML (basic)
   */
  renderHTML(document) {
    // Basic HTML rendering - can be enhanced as needed
    const markdown = this.renderMarkdown(document);
    return `<!DOCTYPE html>
<html>
<head>
  <title>${document.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { border-bottom: 2px solid #333; }
    h2 { color: #333; border-bottom: 1px solid #ccc; }
    h3 { color: #555; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .disclaimer { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-top: 30px; }
  </style>
</head>
<body>
<pre>${markdown}</pre>
</body>
</html>`;
  }
}

export default {
  CitationFormatter,
  DocumentSection,
  RecommendationDocument,
  ProfessionalFormatter
};
