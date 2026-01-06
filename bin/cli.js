#!/usr/bin/env node

/**
 * VA Claims Expert System CLI
 *
 * Command-line interface for analyzing veteran disability claims
 * and recommending optimal appeal pathways.
 */

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { PathwayRecommender } from '../src/recommendation/pathway-recommender.js';
import { RuleEvaluator } from '../src/rules/rule-evaluator.js';
import { APPEAL_PATHWAYS, getAllRules } from '../src/rules/legal-rules.js';

// ASCII banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║           VA CLAIMS EXPERT SYSTEM v1.0.0                      ║
║      Analyze Claims • Identify Errors • Recommend Appeals     ║
╚═══════════════════════════════════════════════════════════════╝
`;

/**
 * Display formatted section header
 */
function sectionHeader(title) {
  console.log('\n' + chalk.cyan('─'.repeat(60)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('─'.repeat(60)));
}

/**
 * Interactive questionnaire for case analysis
 */
async function runQuestionnaire() {
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
        { name: 'Reopened claim (previously denied, filing again)', value: 'reopened' }
      ]
    },
    {
      type: 'input',
      name: 'decisionDate',
      message: 'Date of VA decision (YYYY-MM-DD):',
      validate: input => {
        if (!input) return true; // Optional
        const date = new Date(input);
        return !isNaN(date.getTime()) || 'Please enter a valid date';
      }
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
      message: 'Was the examination adequate (examiner provided rationale, reviewed records)?',
      when: answers => answers.examProvided,
      default: true
    }
  ]);

  sectionHeader('EVIDENCE & RECORDS');

  const evidenceInfo = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasNexusOpinion',
      message: 'Do you have a medical opinion linking your condition to service?',
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
      name: 'hasNewEvidence',
      message: 'Do you have NEW evidence that wasn\'t in the original claim?',
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
      name: 'benefitOfDoubtApplied',
      message: 'Do you believe the evidence was roughly equal but VA denied anyway?',
      default: false
    },
    {
      type: 'confirm',
      name: 'credibilityAtIssue',
      message: 'Is your credibility/testimony a key issue in this case?',
      default: false
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
      message: 'How strong do you think your current evidence is?',
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
    facts: {
      ...basicInfo,
      ...examInfo,
      ...evidenceInfo,
      ...decisionInfo
    },
    strategicFactors: strategicInfo
  };

  return caseData;
}

/**
 * Display recommendation results
 */
function displayRecommendation(recommendation) {
  console.log('\n');
  sectionHeader('ANALYSIS RESULTS');

  // Primary recommendation
  if (recommendation.primaryPathway) {
    const primary = recommendation.primaryPathway;
    console.log('\n' + chalk.green.bold('✓ RECOMMENDED PATHWAY:'));
    console.log(chalk.white.bold(`  ${primary.pathway.name}`));
    console.log(chalk.gray(`  ${primary.pathway.description}`));
    console.log(chalk.yellow(`  Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`));
    console.log(chalk.cyan(`  Avg. Processing Time: ${primary.pathway.averageProcessingDays} days`));

    // Pathway features
    console.log('\n' + chalk.white('  Features:'));
    console.log(`    • New evidence allowed: ${primary.pathway.allowsNewEvidence ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`    • Hearing available: ${primary.pathway.allowsHearing ? chalk.green('Yes') : chalk.red('No')}`);
    if (primary.pathway.timeLimit) {
      console.log(`    • Time limit: ${primary.pathway.timeLimit} days from decision`);
    }
  }

  // Legal triggers
  const triggers = recommendation.primaryPathway?.triggers || [];
  if (triggers.length > 0) {
    console.log('\n' + chalk.white.bold('  Legal Basis:'));
    for (const trigger of triggers.slice(0, 5)) {
      console.log(chalk.white(`    • ${trigger.citation || trigger.ruleName}`));
      console.log(chalk.gray(`      ${trigger.reasoning}`));
    }
  }

  // Alternative pathways
  if (recommendation.alternativePathways.length > 0) {
    console.log('\n' + chalk.yellow.bold('  Alternative Pathways:'));
    for (const alt of recommendation.alternativePathways.slice(0, 2)) {
      const scorePercent = recommendation.primaryPathway
        ? ((alt.adjustedScore / recommendation.primaryPathway.adjustedScore) * 100).toFixed(0)
        : '0';
      console.log(chalk.white(`    • ${alt.pathway.name} (${scorePercent}% relative score)`));
    }
  }

  // Warnings
  if (recommendation.warnings.length > 0) {
    console.log('\n' + chalk.red.bold('⚠ WARNINGS:'));
    for (const warning of recommendation.warnings) {
      const icon = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🔵';
      console.log(`  ${icon} ${chalk.white(warning.message)}`);
    }
  }

  // Action items
  if (recommendation.actionItems.length > 0) {
    console.log('\n' + chalk.cyan.bold('📋 ACTION ITEMS:'));
    for (const item of recommendation.actionItems) {
      const priorityColor = item.priority === 'high' ? chalk.red : item.priority === 'medium' ? chalk.yellow : chalk.gray;
      console.log(`  ${priorityColor('['+ item.priority.toUpperCase() + ']')} ${item.action}`);
      if (item.deadline) {
        console.log(chalk.gray(`      Deadline: ${item.deadline}`));
      }
    }
  }

  // Full reasoning
  console.log('\n');
  sectionHeader('DETAILED ANALYSIS');
  console.log(recommendation.reasoning);
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
    console.log(`  • Time limit: ${pathway.timeLimit ? pathway.timeLimit + ' days' : 'None'}`);
    console.log(`  • New evidence: ${pathway.allowsNewEvidence ? chalk.green('Allowed') : chalk.red('Not allowed')}`);
    console.log(`  • Hearing: ${pathway.allowsHearing ? chalk.green('Available') : chalk.red('Not available')}`);
    console.log(`  • Avg. processing: ${chalk.yellow(pathway.averageProcessingDays + ' days')}`);
    console.log(chalk.white('  Best for:'));
    for (const use of pathway.bestFor) {
      console.log(chalk.gray(`    - ${use}`));
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
    'no_exam': 'HLR',
    'bad_exam': 'SUPPLEMENTAL',
    'no_nexus': 'SUPPLEMENTAL',
    'ignored_evidence': 'HLR',
    'legal_error': 'BOARD_DIRECT',
    'rating_low': answers.hasNewEvidence ? 'SUPPLEMENTAL' : 'HLR',
    'unknown': 'SUPPLEMENTAL'
  };

  const pathwayId = quickMap[answers.mainIssue];
  const pathway = APPEAL_PATHWAYS[pathwayId];

  console.log('\n' + chalk.green.bold('QUICK RECOMMENDATION:'));
  console.log(chalk.white.bold(`  ${pathway.name}`));
  console.log(chalk.gray(`  ${pathway.description}\n`));
  console.log(chalk.yellow('For detailed analysis, run: va-claims analyze'));
}

// Set up CLI commands
program
  .name('va-claims')
  .description('VA Claims Expert System - Analyze claims and recommend appeal pathways')
  .version('1.0.0');

program
  .command('analyze')
  .description('Run full interactive analysis')
  .action(async () => {
    try {
      const caseData = await runQuestionnaire();
      const recommender = new PathwayRecommender();
      const recommendation = recommender.recommend(caseData);
      displayRecommendation(recommendation);
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
  .command('rules')
  .description('Display all legal rules in the database')
  .action(displayRules);

program
  .command('pathways')
  .description('Display all appeal pathways')
  .action(displayPathways);

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
        console.log(chalk.red(`  ⛔ DEADLINE PASSED`));
      } else if (info.urgent) {
        console.log(chalk.yellow(`  ⚠️ URGENT: ${info.daysRemaining} days remaining`));
        console.log(chalk.gray(`    Deadline: ${info.deadline}`));
      } else if (info.deadline) {
        console.log(chalk.green(`  ✓ ${info.daysRemaining} days remaining`));
        console.log(chalk.gray(`    Deadline: ${info.deadline}`));
      } else {
        console.log(chalk.gray(`  No time limit`));
        if (info.note) {
          console.log(chalk.gray(`    Note: ${info.note}`));
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
