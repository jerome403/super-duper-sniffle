#!/usr/bin/env node

/**
 * VA Claims Decision-Support System CLI
 *
 * Command-line interface for analyzing veteran disability claims
 * and recommending optimal appeal pathways.
 *
 * Phase 1: Legal Foundation with Decision-Support
 */

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { PathwayRecommender } from '../src/recommendation/pathway-recommender.js';
import { RuleEvaluator } from '../src/rules/rule-evaluator.js';
import { APPEAL_PATHWAYS, getAllRules } from '../src/rules/legal-rules.js';
import { SMCAnalyzer, SMC_LEVELS } from '../src/rules/smc-rules.js';
import { ColvinAnalyzer } from '../src/rules/colvin-analyzer.js';
import { ProfessionalFormatter } from '../src/output/professional-formatter.js';
import { DENIAL_REASONS } from '../src/models/case-schema.js';

// ASCII banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════════════╗
║                    VA CLAIMS DECISION-SUPPORT SYSTEM                   ║
║                              Version 1.1.0                             ║
║        Analyze Claims • Identify Errors • Recommend Pathways           ║
╚═══════════════════════════════════════════════════════════════════════╝
`;

/**
 * Display formatted section header
 */
function sectionHeader(title) {
  console.log('\n' + chalk.cyan('─'.repeat(70)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('─'.repeat(70)));
}

/**
 * Display formatted subsection
 */
function subSection(title) {
  console.log('\n' + chalk.white.bold(`  ${title}`));
  console.log(chalk.gray('  ' + '─'.repeat(40)));
}

/**
 * Interactive questionnaire for comprehensive case analysis
 */
async function runFullAnalysis() {
  console.log(chalk.yellow(BANNER));

  sectionHeader('CASE INFORMATION');

  // Basic case info
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'condition',
      message: 'What condition is being claimed?',
      validate: input => input.length > 0 || 'Please enter the condition'
    },
    {
      type: 'list',
      name: 'claimType',
      message: 'What type of claim is this?',
      choices: [
        { name: 'Initial claim (first time claiming this condition)', value: 'initial' },
        { name: 'Claim for increase (condition has worsened)', value: 'increase' },
        { name: 'Secondary claim (caused by service-connected condition)', value: 'secondary' },
        { name: 'Reopened claim (previously denied, filing again)', value: 'reopened' },
        { name: 'TDIU (Total Disability Individual Unemployability)', value: 'tdiu' },
        { name: 'SMC (Special Monthly Compensation)', value: 'smc' }
      ]
    },
    {
      type: 'input',
      name: 'decisionDate',
      message: 'Date of VA decision (YYYY-MM-DD):',
      validate: input => {
        if (!input) return true;
        const date = new Date(input);
        return !isNaN(date.getTime()) || 'Please enter a valid date (YYYY-MM-DD)';
      }
    },
    {
      type: 'list',
      name: 'denialReason',
      message: 'Primary reason for denial (if known):',
      choices: [
        { name: 'No current disability found', value: 'NO_CURRENT_DISABILITY' },
        { name: 'No in-service event documented', value: 'NO_IN_SERVICE_EVENT' },
        { name: 'No medical nexus opinion', value: 'NO_NEXUS' },
        { name: 'Negative nexus opinion from examiner', value: 'NEGATIVE_NEXUS_OPINION' },
        { name: 'C&P exam not provided', value: 'NO_EXAM_PROVIDED' },
        { name: 'C&P exam was inadequate', value: 'INADEQUATE_EXAM' },
        { name: 'Rating percentage too low', value: 'RATING_TOO_LOW' },
        { name: 'Effective date issue', value: 'EFFECTIVE_DATE_ERROR' },
        { name: 'Secondary connection not established', value: 'SECONDARY_NOT_ESTABLISHED' },
        { name: 'Other / Not sure', value: 'OTHER' }
      ]
    }
  ]);

  sectionHeader('C&P EXAMINATION');

  const examInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'examProvided',
      message: 'Was a C&P examination provided for this claim?',
      default: true
    },
    {
      type: 'confirm',
      name: 'examAdequate',
      message: 'Was the examination adequate? (examiner provided rationale, reviewed records)',
      when: answers => answers.examProvided,
      default: true
    },
    {
      type: 'list',
      name: 'examinerOpinion',
      message: "What was the examiner's opinion on nexus/connection?",
      when: answers => answers.examProvided,
      choices: [
        { name: 'Positive - at least as likely as not', value: 'positive' },
        { name: 'Negative - less likely than not', value: 'negative' },
        { name: 'Equivocal - unclear or speculative', value: 'equivocal' },
        { name: 'No opinion provided', value: 'none' }
      ]
    }
  ]);

  sectionHeader('EVIDENCE & RECORDS');

  const evidenceInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasNexusOpinion',
      message: 'Do you have ANY positive medical nexus opinion (from C&P, IMO, or treating doctor)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'hasIMO',
      message: 'Have you submitted an Independent Medical Opinion (IMO)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'imoRejected',
      message: 'Was your IMO rejected or given little weight?',
      when: answers => answers.hasIMO,
      default: false
    },
    {
      type: 'confirm',
      name: 'vaRecordsObtained',
      message: 'Were your VA treatment records obtained and reviewed?',
      default: true
    },
    {
      type: 'confirm',
      name: 'strsComplete',
      message: 'Are your service treatment records (STRs) complete in your file?',
      default: true
    },
    {
      type: 'confirm',
      name: 'hasBuddyStatements',
      message: 'Have you submitted buddy statements from fellow service members?',
      default: false
    },
    {
      type: 'confirm',
      name: 'hasNewEvidence',
      message: "Do you have NEW evidence that wasn't in the original claim?",
      default: false
    },
    {
      type: 'confirm',
      name: 'canObtainNewEvidence',
      message: 'Can you obtain new medical evidence (IMO, buddy statements, etc.)?',
      default: true
    }
  ]);

  sectionHeader('VA DECISION ANALYSIS');

  const decisionInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'currentDisabilityConceded',
      message: 'Did VA acknowledge you have a current disability?',
      default: true
    },
    {
      type: 'confirm',
      name: 'inServiceEventConceded',
      message: 'Did VA acknowledge an in-service event/injury occurred?',
      default: false
    },
    {
      type: 'confirm',
      name: 'layEvidenceConsidered',
      message: 'Did VA properly consider your lay statements about symptoms?',
      default: true
    },
    {
      type: 'confirm',
      name: 'benefitOfDoubtNotApplied',
      message: 'Do you believe evidence was roughly equal but VA denied anyway?',
      default: false
    },
    {
      type: 'confirm',
      name: 'vaRejectedMedicalOpinion',
      message: 'Did VA reject a favorable medical opinion without citing contrary medical evidence?',
      default: false
    }
  ]);

  sectionHeader('COLVIN VIOLATION CHECK');

  const colvinInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'raterMadeMedicalConclusion',
      message: 'Did the decision make medical conclusions without citing medical evidence?',
      default: false
    },
    {
      type: 'input',
      name: 'decisionText',
      message: 'Paste any concerning language from the decision (optional):',
      default: ''
    }
  ]);

  sectionHeader('STRATEGIC FACTORS');

  const strategicInfo = await inquirer.prompt([
    {
      type: 'list',
      name: 'time_sensitivity',
      message: 'How important is a quick resolution?',
      choices: [
        { name: 'Critical - need decision ASAP (financial hardship)', value: 'critical' },
        { name: 'High - would prefer faster resolution', value: 'high' },
        { name: 'Moderate - no strong time pressure', value: 'moderate' },
        { name: 'Low - willing to wait for best outcome', value: 'low' }
      ]
    },
    {
      type: 'list',
      name: 'evidence_strength',
      message: 'How strong is your current evidence?',
      choices: [
        { name: 'Strong - clear medical support and documentation', value: 'strong' },
        { name: 'Moderate - some supporting evidence', value: 'moderate' },
        { name: 'Weak - limited documentation', value: 'weak' }
      ]
    },
    {
      type: 'list',
      name: 'complexity',
      message: 'How complex is your case?',
      choices: [
        { name: 'Simple - straightforward single issue', value: 'simple' },
        { name: 'Moderate - some complexity', value: 'moderate' },
        { name: 'Complex - multiple issues or unusual circumstances', value: 'complex' },
        { name: 'Very complex - legal interpretations, multiple conditions', value: 'very_complex' }
      ]
    },
    {
      type: 'list',
      name: 'veteran_testimony',
      message: 'Would your testimony at a hearing help your case?',
      choices: [
        { name: 'Critical - my testimony would be very compelling', value: 'critical' },
        { name: 'Helpful - testimony would add value', value: 'helpful' },
        { name: 'Neutral - not sure it would matter', value: 'neutral' },
        { name: 'Not needed - evidence speaks for itself', value: 'not_needed' }
      ]
    },
    {
      type: 'list',
      name: 'prior_denials',
      message: 'How many times has this claim been denied?',
      choices: [
        { name: 'First denial', value: 'first_denial' },
        { name: 'Second denial', value: 'second_denial' },
        { name: 'Multiple denials (3+)', value: 'multiple_denials' }
      ]
    }
  ]);

  // Combine all answers
  const caseData = {
    condition: basicInfo.condition,
    claimType: basicInfo.claimType,
    facts: {
      decisionDate: basicInfo.decisionDate,
      denialReason: basicInfo.denialReason,
      examProvided: examInfo.examProvided,
      examAdequate: examInfo.examAdequate,
      examinerOpinion: examInfo.examinerOpinion,
      hasNexusOpinion: evidenceInfo.hasNexusOpinion,
      hasIMO: evidenceInfo.hasIMO,
      imoRejected: evidenceInfo.imoRejected,
      vaRecordsObtained: evidenceInfo.vaRecordsObtained,
      strsComplete: evidenceInfo.strsComplete,
      hasBuddyStatements: evidenceInfo.hasBuddyStatements,
      hasNewEvidence: evidenceInfo.hasNewEvidence,
      canObtainNewEvidence: evidenceInfo.canObtainNewEvidence,
      currentDisabilityConceded: decisionInfo.currentDisabilityConceded,
      inServiceEventConceded: decisionInfo.inServiceEventConceded,
      layEvidenceConsidered: decisionInfo.layEvidenceConsidered,
      benefitOfDoubtApplied: !decisionInfo.benefitOfDoubtNotApplied,
      // Colvin indicators
      hasFavorableMedicalOpinion: evidenceInfo.hasNexusOpinion,
      claimDenied: true,
      hasContraryMedicalOpinion: examInfo.examinerOpinion === 'negative',
      imoSubmitted: evidenceInfo.hasIMO,
      vaRejectedMedicalOpinion: decisionInfo.vaRejectedMedicalOpinion,
      raterMadeMedicalConclusion: colvinInfo.raterMadeMedicalConclusion
    },
    decisionText: colvinInfo.decisionText,
    strategicFactors: strategicInfo
  };

  return caseData;
}

/**
 * Run Colvin violation analysis
 */
function runColvinAnalysis(caseData) {
  const analyzer = new ColvinAnalyzer();

  // Prepare data for Colvin analysis
  const colvinData = {
    hasFavorableMedicalOpinion: caseData.facts.hasNexusOpinion || caseData.facts.hasIMO,
    claimDenied: true,
    hasContraryMedicalOpinion: caseData.facts.examinerOpinion === 'negative',
    imoSubmitted: caseData.facts.hasIMO,
    imoRejected: caseData.facts.imoRejected,
    cpExamPositive: caseData.facts.examinerOpinion === 'positive',
    vaRejectedMedicalOpinion: caseData.facts.vaRejectedMedicalOpinion,
    decisionText: caseData.decisionText,
    denialReasons: [caseData.facts.denialReason]
  };

  const analysis = analyzer.analyze(colvinData);

  return analysis;
}

/**
 * Display comprehensive recommendation results
 */
function displayRecommendation(recommendation, colvinAnalysis, caseData) {
  console.log('\n');
  sectionHeader('ANALYSIS RESULTS');

  // Primary recommendation
  if (recommendation.primaryPathway) {
    const primary = recommendation.primaryPathway;
    console.log('\n' + chalk.green.bold('RECOMMENDED PATHWAY:'));
    console.log(chalk.white.bold(`  ${primary.pathway.name}`));
    console.log(chalk.gray(`  ${primary.pathway.description}`));
    console.log(chalk.yellow(`  Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`));
    console.log(chalk.cyan(`  Avg. Processing Time: ${primary.pathway.averageProcessingDays} days`));

    // Pathway features
    subSection('Pathway Features');
    console.log(`  New evidence allowed: ${primary.pathway.allowsNewEvidence ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Hearing available: ${primary.pathway.allowsHearing ? chalk.green('Yes') : chalk.red('No')}`);
    if (primary.pathway.timeLimit) {
      console.log(`  Time limit: ${primary.pathway.timeLimit} days from decision`);
    } else {
      console.log(`  Time limit: ${chalk.green('None')} (but file within 1 year to preserve effective date)`);
    }
  }

  // Colvin Violation Analysis
  if (colvinAnalysis && colvinAnalysis.hasViolation) {
    subSection('COLVIN VIOLATION DETECTED');
    console.log(chalk.red.bold(`  Type: ${colvinAnalysis.violationType.name}`));
    console.log(chalk.white(`  ${colvinAnalysis.violationType.description}`));
    console.log(chalk.cyan(`  Citation: ${colvinAnalysis.violationType.citation}`));
    console.log(chalk.yellow(`  Confidence: ${(colvinAnalysis.confidence * 100).toFixed(0)}%`));
    console.log(chalk.green(`  Remedy: ${colvinAnalysis.violationType.remedy}`));

    if (colvinAnalysis.phraseMatches.length > 0) {
      console.log(chalk.white('\n  Concerning Language Found:'));
      for (const match of colvinAnalysis.phraseMatches.slice(0, 3)) {
        console.log(chalk.gray(`    "${match.phrase}"`));
        console.log(chalk.gray(`    - ${match.explanation}`));
      }
    }
  }

  // Legal triggers
  const triggers = recommendation.primaryPathway?.triggers || [];
  if (triggers.length > 0) {
    subSection('Legal Issues Identified');
    for (const trigger of triggers.slice(0, 5)) {
      console.log(chalk.cyan(`  ${trigger.citation || trigger.ruleName}`));
      console.log(chalk.gray(`    ${trigger.reasoning}`));
    }
  }

  // Alternative pathways
  if (recommendation.alternativePathways.length > 0) {
    subSection('Alternative Pathways');
    for (const alt of recommendation.alternativePathways.slice(0, 2)) {
      const scorePercent = recommendation.primaryPathway
        ? ((alt.adjustedScore / recommendation.primaryPathway.adjustedScore) * 100).toFixed(0)
        : '0';
      console.log(chalk.white(`  ${alt.pathway.name} (${scorePercent}% relative strength)`));
      console.log(chalk.gray(`    ${alt.pathway.description}`));
    }
  }

  // Warnings
  if (recommendation.warnings.length > 0) {
    subSection('WARNINGS');
    for (const warning of recommendation.warnings) {
      const icon = warning.severity === 'high' ? chalk.red('!') : warning.severity === 'medium' ? chalk.yellow('!') : chalk.blue('i');
      console.log(`  ${icon} ${chalk.white(warning.message)}`);
    }
  }

  // Action items
  if (recommendation.actionItems.length > 0) {
    subSection('ACTION ITEMS');
    for (const item of recommendation.actionItems) {
      const priorityColor = item.priority === 'high' ? chalk.red : item.priority === 'medium' ? chalk.yellow : chalk.gray;
      console.log(`  ${priorityColor('[' + item.priority.toUpperCase() + ']')} ${item.action}`);
      if (item.deadline) {
        console.log(chalk.gray(`      Deadline: ${item.deadline}`));
      }
    }
  }

  // Full reasoning
  sectionHeader('DETAILED LEGAL ANALYSIS');
  console.log(recommendation.reasoning);

  // Legal citations
  sectionHeader('APPLICABLE LEGAL AUTHORITIES');
  const citations = new Set();
  for (const trigger of triggers) {
    if (trigger.citation) citations.add(trigger.citation);
  }
  if (colvinAnalysis?.hasViolation) {
    citations.add(colvinAnalysis.violationType.citation);
    for (const caseRef of colvinAnalysis.supportingCaseLaw || []) {
      citations.add(caseRef.citation);
    }
  }
  citations.add('38 C.F.R. § 3.159 - Duty to Assist');
  citations.add('38 C.F.R. § 3.303 - Service Connection');

  for (const citation of citations) {
    console.log(chalk.cyan(`  ${citation}`));
  }
}

/**
 * Display all legal rules
 */
function displayRules() {
  console.log(chalk.yellow(BANNER));
  sectionHeader('LEGAL RULES DATABASE');

  const rules = getAllRules();

  console.log('\n' + chalk.cyan.bold('DUTY TO ASSIST RULES (38 CFR 3.159)'));
  for (const [id, rule] of Object.entries(rules.dutyToAssist)) {
    console.log(`\n  ${chalk.white.bold(rule.citation)}: ${rule.name}`);
    console.log(chalk.gray(`    ${rule.description}`));
  }

  console.log('\n' + chalk.cyan.bold('SERVICE CONNECTION RULES (38 CFR 3.303, 3.310)'));
  for (const [id, rule] of Object.entries(rules.serviceConnection)) {
    console.log(`\n  ${chalk.white.bold(rule.citation)}: ${rule.name}`);
    console.log(chalk.gray(`    ${rule.description}`));
  }

  console.log('\n' + chalk.cyan.bold('KEY CASE LAW'));
  for (const [id, rule] of Object.entries(rules.caseLaw)) {
    console.log(`\n  ${chalk.white.bold(rule.citation)}`);
    console.log(chalk.gray(`    ${rule.description}`));
  }

  console.log('\n' + chalk.cyan.bold('RATING SCHEDULE RULES'));
  for (const [id, rule] of Object.entries(rules.ratingSchedule)) {
    const citation = rule.citation || id;
    console.log(`\n  ${chalk.white.bold(citation)}: ${rule.name}`);
    console.log(chalk.gray(`    ${rule.description}`));
  }
}

/**
 * Display appeal pathways
 */
function displayPathways() {
  console.log(chalk.yellow(BANNER));
  sectionHeader('APPEAL PATHWAYS UNDER AMA');

  for (const [id, pathway] of Object.entries(APPEAL_PATHWAYS)) {
    console.log(`\n${chalk.cyan.bold(pathway.name)} (${id})`);
    console.log(chalk.gray(`  ${pathway.description}`));
    console.log(`  Time limit: ${pathway.timeLimit ? pathway.timeLimit + ' days' : chalk.green('None')}`);
    console.log(`  New evidence: ${pathway.allowsNewEvidence ? chalk.green('Allowed') : chalk.red('Not allowed')}`);
    console.log(`  Hearing: ${pathway.allowsHearing ? chalk.green('Available') : chalk.red('Not available')}`);
    console.log(`  Avg. processing: ${chalk.yellow(pathway.averageProcessingDays + ' days')}`);
    console.log(chalk.white('  Best for:'));
    for (const use of pathway.bestFor) {
      console.log(chalk.gray(`    - ${use}`));
    }
  }
}

/**
 * Display SMC levels
 */
function displaySMC() {
  console.log(chalk.yellow(BANNER));
  sectionHeader('SPECIAL MONTHLY COMPENSATION (SMC) LEVELS');

  for (const [id, level] of Object.entries(SMC_LEVELS)) {
    console.log(`\n${chalk.cyan.bold(level.name)}`);
    console.log(chalk.gray(`  ${level.description}`));
    console.log(chalk.white(`  Statute: ${level.statute}`));
    console.log(chalk.white(`  Regulation: ${level.cfr}`));

    if (level.requirements?.criteria) {
      console.log(chalk.white('  Requirements:'));
      for (const req of level.requirements.criteria.slice(0, 4)) {
        console.log(chalk.gray(`    - ${req}`));
      }
    }
  }
}

/**
 * Display denial reasons with counter-strategies
 */
function displayDenialReasons() {
  console.log(chalk.yellow(BANNER));
  sectionHeader('DENIAL REASONS & COUNTER-STRATEGIES');

  for (const [id, reason] of Object.entries(DENIAL_REASONS)) {
    console.log(`\n${chalk.cyan.bold(reason.description)}`);
    console.log(chalk.gray(`  Legal Basis: ${reason.legalBasis}`));
    console.log(chalk.white(`  Citation: ${reason.citation}`));
    console.log(chalk.green(`  Recommended Pathway: ${reason.recommendedPathway}`));
    console.log(chalk.white('  Counter-Strategies:'));
    for (const strategy of reason.counterStrategies) {
      console.log(chalk.yellow(`    - ${strategy}`));
    }
  }
}

/**
 * Quick analysis with minimal questions
 */
async function quickAnalysis() {
  console.log(chalk.yellow(BANNER));
  sectionHeader('QUICK ANALYSIS');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'condition',
      message: 'What condition?'
    },
    {
      type: 'list',
      name: 'mainIssue',
      message: 'What is the main issue with your denial?',
      choices: [
        { name: 'No C&P exam was provided', value: 'no_exam' },
        { name: 'C&P exam was inadequate', value: 'bad_exam' },
        { name: 'Missing nexus/medical connection', value: 'no_nexus' },
        { name: 'VA rejected my medical opinion without contrary evidence', value: 'colvin' },
        { name: 'VA ignored my evidence', value: 'ignored_evidence' },
        { name: 'VA made wrong legal determination', value: 'legal_error' },
        { name: 'Rating percentage is too low', value: 'rating_low' },
        { name: 'Not sure / Multiple issues', value: 'unknown' }
      ]
    },
    {
      type: 'confirm',
      name: 'hasNewEvidence',
      message: 'Can you get new medical evidence?',
      default: true
    }
  ]);

  // Map to quick recommendation
  const quickMap = {
    'no_exam': { pathway: 'HLR', reason: 'Duty to assist violation - clear procedural error' },
    'bad_exam': { pathway: 'SUPPLEMENTAL', reason: 'Submit new adequate medical evidence' },
    'no_nexus': { pathway: 'SUPPLEMENTAL', reason: 'New nexus opinion is new and relevant evidence' },
    'colvin': { pathway: 'HLR', reason: 'Colvin violation - VA cannot reject medical evidence without contrary medical evidence' },
    'ignored_evidence': { pathway: 'HLR', reason: 'Procedural error in weighing evidence' },
    'legal_error': { pathway: 'BOARD_DIRECT', reason: 'Legal interpretation best addressed by Board' },
    'rating_low': { pathway: answers.hasNewEvidence ? 'SUPPLEMENTAL' : 'HLR', reason: answers.hasNewEvidence ? 'New DBQ documenting severity' : 'Challenge rating criteria application' },
    'unknown': { pathway: 'SUPPLEMENTAL', reason: 'New evidence provides fresh review opportunity' }
  };

  const rec = quickMap[answers.mainIssue];
  const pathway = APPEAL_PATHWAYS[rec.pathway];

  console.log('\n' + chalk.green.bold('QUICK RECOMMENDATION:'));
  console.log(chalk.white.bold(`  ${pathway.name}`));
  console.log(chalk.gray(`  ${pathway.description}`));
  console.log(chalk.cyan(`\n  Reasoning: ${rec.reason}`));

  if (answers.mainIssue === 'colvin') {
    console.log(chalk.yellow('\n  Key Citation: Colvin v. Derwinski, 1 Vet. App. 171 (1991)'));
    console.log(chalk.white('  "VA cannot substitute its own unsubstantiated medical'));
    console.log(chalk.white('   conclusions for that of a medical professional."'));
  }

  console.log(chalk.gray('\n  For detailed analysis, run: va-claims analyze'));
}

/**
 * Export professional report
 */
async function exportReport(format = 'text') {
  console.log(chalk.yellow(BANNER));
  console.log(chalk.cyan('Running full analysis for professional report...\n'));

  try {
    const caseData = await runFullAnalysis();
    const recommender = new PathwayRecommender();
    const recommendation = recommender.recommend(caseData);

    const formatter = new ProfessionalFormatter({ outputFormat: format });
    const document = formatter.formatRecommendation(recommendation, caseData);
    const output = formatter.render(document);

    sectionHeader('PROFESSIONAL REPORT');
    console.log(output);

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log('\nReport generation cancelled.');
    } else {
      throw error;
    }
  }
}

// Set up CLI commands
program
  .name('va-claims')
  .description('VA Claims Decision-Support System - Analyze claims and recommend appeal pathways')
  .version('1.1.0');

program
  .command('analyze')
  .description('Run full interactive analysis with Colvin violation detection')
  .action(async () => {
    try {
      const caseData = await runFullAnalysis();
      const recommender = new PathwayRecommender();
      const recommendation = recommender.recommend(caseData);
      const colvinAnalysis = runColvinAnalysis(caseData);
      displayRecommendation(recommendation, colvinAnalysis, caseData);
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        console.log('\nAnalysis cancelled.');
      } else {
        throw error;
      }
    }
  });

program
  .command('quick')
  .description('Quick analysis with minimal questions')
  .action(quickAnalysis);

program
  .command('report')
  .description('Generate professional report')
  .option('-f, --format <format>', 'Output format (text, markdown)', 'text')
  .action((options) => exportReport(options.format));

program
  .command('rules')
  .description('Display all legal rules in the database')
  .action(displayRules);

program
  .command('pathways')
  .description('Display all appeal pathways under AMA')
  .action(displayPathways);

program
  .command('smc')
  .description('Display Special Monthly Compensation (SMC) levels')
  .action(displaySMC);

program
  .command('denials')
  .description('Display denial reasons with counter-strategies')
  .action(displayDenialReasons);

program
  .command('deadline')
  .description('Check appeal deadlines from decision date')
  .argument('<date>', 'Decision date (YYYY-MM-DD)')
  .action((date) => {
    const evaluator = new RuleEvaluator();
    const deadlines = evaluator.checkDeadlines({ decisionDate: date });

    console.log(chalk.yellow(BANNER));
    sectionHeader('APPEAL DEADLINES');
    console.log(chalk.white(`\nDecision Date: ${deadlines.decisionDate}`));
    console.log(chalk.white(`Days Since Decision: ${deadlines.daysSinceDecision}`));

    for (const [pathwayId, info] of Object.entries(deadlines.pathwayDeadlines)) {
      const pathway = APPEAL_PATHWAYS[pathwayId];
      console.log(`\n${chalk.cyan(pathway.name)}:`);

      if (info.expired) {
        console.log(chalk.red(`  DEADLINE PASSED`));
      } else if (info.urgent) {
        console.log(chalk.yellow(`  URGENT: ${info.daysRemaining} days remaining`));
        console.log(chalk.gray(`    Deadline: ${info.deadline}`));
      } else if (info.deadline) {
        console.log(chalk.green(`  ${info.daysRemaining} days remaining`));
        console.log(chalk.gray(`    Deadline: ${info.deadline}`));
      } else {
        console.log(chalk.gray(`  No time limit`));
        if (info.note) {
          console.log(chalk.gray(`    Note: ${info.note}`));
        }
      }
    }
  });

program
  .command('colvin')
  .description('Check for Colvin violation indicators')
  .action(async () => {
    console.log(chalk.yellow(BANNER));
    sectionHeader('COLVIN VIOLATION CHECKER');

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'favorableOpinion',
        message: 'Did you submit a favorable medical opinion?',
        default: false
      },
      {
        type: 'confirm',
        name: 'opinionRejected',
        message: 'Was the opinion rejected or given little weight?',
        when: a => a.favorableOpinion,
        default: false
      },
      {
        type: 'confirm',
        name: 'contraryOpinion',
        message: 'Did VA cite a contrary medical opinion to reject yours?',
        when: a => a.opinionRejected,
        default: false
      },
      {
        type: 'input',
        name: 'decisionText',
        message: 'Paste any concerning decision language (optional):',
        default: ''
      }
    ]);

    const analyzer = new ColvinAnalyzer();
    const quickResult = analyzer.quickCheck({
      hasFavorableMedicalOpinion: answers.favorableOpinion,
      claimDenied: true,
      hasContraryMedicalOpinion: answers.contraryOpinion,
      imoSubmitted: answers.favorableOpinion,
      imoRejected: answers.opinionRejected
    });

    console.log('\n');
    if (quickResult.likelyViolation) {
      console.log(chalk.red.bold('POTENTIAL COLVIN VIOLATION DETECTED'));
      console.log(chalk.yellow(`Confidence: ${(quickResult.confidence * 100).toFixed(0)}%`));

      for (const flag of quickResult.redFlags) {
        console.log(chalk.white(`\n  Issue: ${flag.flag}`));
        console.log(chalk.cyan(`  Action: ${flag.action}`));
      }

      console.log(chalk.white('\n  Key Citation: Colvin v. Derwinski, 1 Vet. App. 171 (1991)'));
    } else {
      console.log(chalk.green('No obvious Colvin indicators found.'));
      console.log(chalk.gray('Run full analysis for comprehensive review.'));
    }

    if (answers.decisionText) {
      const textAnalysis = analyzer.analyze({ decisionText: answers.decisionText });
      if (textAnalysis.phraseMatches.length > 0) {
        console.log(chalk.yellow('\n  Concerning phrases found in decision text:'));
        for (const match of textAnalysis.phraseMatches.slice(0, 5)) {
          console.log(chalk.white(`    "${match.phrase}"`));
          console.log(chalk.gray(`    - ${match.explanation}`));
        }
      }
    }
  });

// Default action - show help
program.action(() => {
  console.log(chalk.yellow(BANNER));
  program.help();
});

program.parse();
