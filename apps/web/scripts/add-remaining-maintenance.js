#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '../lib/journey/stages/templates.ts');
let content = fs.readFileSync(templatesPath, 'utf8');

// Define maintenance stages by goal type
const maintenanceByGoal = {
  loss: `    {
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
    },`,
  gain: `    {
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
    },`,
  recomp: `    {
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
          desc_he: 'שמור על הרכב הגוף',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'המשך את הריקומפ',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },`,
  maintain: `    {
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
    },`,
};

const avatarsToAdd = [
  'loss_advanced',
  'gain_beginner',
  'gain_intermediate',
  'gain_advanced',
  'recomp_beginner',
  'recomp_intermediate',
  'recomp_advanced',
  'maintain_beginner',
  'maintain_intermediate',
  'maintain_advanced',
];

avatarsToAdd.forEach(avatar => {
  const [goal, level] = avatar.split('_');
  const maintenanceStage = maintenanceByGoal[goal];

  // Find the pattern: ],\n\n  // ========... // {AVATAR_NAME}
  const nextAvatarIndex = content.indexOf(`// ${avatar.toUpperCase().replace('_', ' - ')}`);

  if (nextAvatarIndex === -1) {
    console.log(`⚠️  Could not find: ${avatar}`);
    return;
  }

  // Find the ],\n before this comment (this is the end of the previous avatar array)
  let searchFrom = nextAvatarIndex;
  let closingBracketIndex = -1;

  // Search backwards for the last ],\n before the comment
  for (let i = nextAvatarIndex - 1; i >= 0; i--) {
    if (content[i] === ']' && content[i+1] === ',' && content[i-2] === ' ' && content[i-3] === ' ') {
      closingBracketIndex = i + 2; // After the ],
      break;
    }
  }

  if (closingBracketIndex === -1) {
    console.log(`⚠️  Could not find closing bracket for: ${avatar}`);
    return;
  }

  // Insert the maintenance stage
  const before = content.slice(0, closingBracketIndex);
  const after = content.slice(closingBracketIndex);
  content = before + '\n' + maintenanceStage + '\n  ' + after;

  console.log(`✅ Added maintenance stage to: ${avatar}`);
});

fs.writeFileSync(templatesPath, content, 'utf8');
console.log('\n✅ All maintenance stages added successfully!');
