#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '../lib/journey/stages/templates.ts');
let content = fs.readFileSync(templatesPath, 'utf8');

const LOSS_MAINTENANCE = `    {
      code: 'MAINTENANCE',
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'שמור על גירעון קלורי',
          desc_he: 'המשך לשרוף שומן',
          points: 10,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
`;

const GAIN_MAINTENANCE = `    {
      code: 'MAINTENANCE',
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על בניית השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'שמור על עודף קלורי',
          desc_he: 'המשך לגדול',
          points: 10,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
`;

const BALANCED_MAINTENANCE = `    {
      code: 'MAINTENANCE',
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'שמור על המשקל',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
`;

// Replace patterns to add maintenance stages
const replacements = [
  {
    before: '  // MUSCLE GAIN - BEGINNER',
    stage: LOSS_MAINTENANCE,
    name: 'loss_advanced'
  },
  {
    before: '  // MUSCLE GAIN - INTERMEDIATE',
    stage: GAIN_MAINTENANCE,
    name: 'gain_beginner'
  },
  {
    before: '  // MUSCLE GAIN - ADVANCED',
    stage: GAIN_MAINTENANCE,
    name: 'gain_intermediate'
  },
  {
    before: '  // RECOMP - BEGINNER',
    stage: GAIN_MAINTENANCE,
    name: 'gain_advanced'
  },
  {
    before: '  // RECOMP - INTERMEDIATE',
    stage: BALANCED_MAINTENANCE,
    name: 'recomp_beginner'
  },
  {
    before: '  // RECOMP - ADVANCED',
    stage: BALANCED_MAINTENANCE,
    name: 'recomp_intermediate'
  },
  {
    before: '  // MAINTAIN - BEGINNER',
    stage: BALANCED_MAINTENANCE,
    name: 'recomp_advanced'
  },
  {
    before: '  // MAINTAIN - INTERMEDIATE',
    stage: BALANCED_MAINTENANCE,
    name: 'maintain_beginner'
  },
  {
    before: '  // MAINTAIN - ADVANCED',
    stage: BALANCED_MAINTENANCE,
    name: 'maintain_intermediate'
  },
  {
    before: '};\n\n/**\n * Get the stage template for a given avatar profile',
    stage: BALANCED_MAINTENANCE,
    name: 'maintain_advanced'
  },
];

replacements.forEach(({ before, stage, name }) => {
  const pattern = `  ],\n\n  // ==========================================\n${before}`;
  const replacement = `  ],\n${stage}  ],\n\n  // ==========================================\n${before}`;

  if (content.includes(pattern)) {
    content = content.replace(pattern, replacement);
    console.log(`✅ Added maintenance to: ${name}`);
  } else {
    console.log(`⚠️  Pattern not found for: ${name}`);
  }
});

fs.writeFileSync(templatesPath, content, 'utf8');
console.log('\n✅ All done!');
