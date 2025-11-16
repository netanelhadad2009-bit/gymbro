#!/usr/bin/env node
/**
 * Script to add maintenance stages to all avatar combinations
 */

const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '../lib/journey/stages/templates.ts');
let content = fs.readFileSync(templatesPath, 'utf8');

// Define maintenance stages for each goal type
const maintenanceStages = {
  loss_intermediate: {
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
  loss_advanced: {
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
  gain_beginner: {
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
  gain_intermediate: {
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
  gain_advanced: {
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
  recomp_beginner: {
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
  },
  recomp_intermediate: {
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
  },
  recomp_advanced: {
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
  },
  maintain_beginner: {
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
  maintain_intermediate: {
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
  maintain_advanced: {
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
};

// Function to format the stage as TypeScript code
function formatStage(stage) {
  return `    {
      code: '${stage.code}',
      title_he: '${stage.title_he}',
      subtitle_he: '${stage.subtitle_he}',
      color_hex: '${stage.color_hex}',
      tasks: [
${stage.tasks.map(task => `        {
          key_code: '${task.key_code}',
          title_he: '${task.title_he}',
          desc_he: '${task.desc_he}',
          points: ${task.points},
          condition_json: ${JSON.stringify(task.condition_json, null, 12).split('\n').map((line, i) => i === 0 ? line : '            ' + line).join('\n')},
        }`).join(',\n')}
      ],
    },`;
}

// Add maintenance stages to each avatar type
Object.entries(maintenanceStages).forEach(([avatarType, stage]) => {
  const commentPattern = new RegExp(`// ==========================================\\s*// ${avatarType.toUpperCase().replace('_', ' - ')}`, 'i');

  // Find the closing bracket before the next avatar section
  const parts = content.split(commentPattern);
  if (parts.length === 2) {
    const beforeComment = parts[0];
    const afterComment = parts[1];

    // Find the last ],\n before the comment
    const lastBracketIndex = beforeComment.lastIndexOf('  ],');

    if (lastBracketIndex !== -1) {
      const stageCode = formatStage(stage);
      content = beforeComment.slice(0, lastBracketIndex + 5) + '\n' + stageCode + '\n' + beforeComment.slice(lastBracketIndex + 5) + '// ==========================================' + afterComment;
    }
  }
});

fs.writeFileSync(templatesPath, content, 'utf8');
console.log('✅ Successfully added maintenance stages to all avatars');
