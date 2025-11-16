#!/usr/bin/env node
/**
 * Script to update stage templates to use dynamic user targets
 */

const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '../lib/journey/stages/templates.ts');
let content = fs.readFileSync(templatesPath, 'utf8');

// Update all WEEKLY_DEFICIT tasks
content = content.replace(
  /type: 'WEEKLY_DEFICIT',\s+target: \d+,(\s+lookback_days: \d+,)?/g,
  (match, lookback) => {
    return `type: 'WEEKLY_DEFICIT',\n            use_user_target: true,${lookback || ''}`;
  }
);

// Update all WEEKLY_SURPLUS tasks
content = content.replace(
  /type: 'WEEKLY_SURPLUS',\s+target: \d+,(\s+lookback_days: \d+,)?/g,
  (match, lookback) => {
    return `type: 'WEEKLY_SURPLUS',\n            use_user_target: true,${lookback || ''}`;
  }
);

// Update all WEEKLY_BALANCED tasks
content = content.replace(
  /type: 'WEEKLY_BALANCED',\s+target: \d+,(\s+lookback_days: \d+,)?/g,
  (match, lookback) => {
    return `type: 'WEEKLY_BALANCED',\n            use_user_target: true,${lookback || ''}`;
  }
);

// Update all HIT_PROTEIN_GOAL tasks
content = content.replace(
  /type: 'HIT_PROTEIN_GOAL',\s+target: \d+,/g,
  `type: 'HIT_PROTEIN_GOAL',\n            use_user_target: true,`
);

// Update protein task titles to be generic
const proteinTitleUpdates = [
  { from: 'הגע ל-120 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-140 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-150 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-160 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-170 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-180 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-190 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'הגע ל-200 גרם חלבון', to: 'הגע ליעד החלבון היומי שלך' },
  { from: 'עמוד ביעד חלבון שבוע שלם', to: 'עמוד ביעד החלבון היומי שלך' },
];

proteinTitleUpdates.forEach(({ from, to }) => {
  content = content.replace(new RegExp(from, 'g'), to);
});

// Update deficit/surplus task titles
const calorieTitleUpdates = [
  { from: 'גירעון של 500 קלוריות ביום', to: 'שמור על גירעון קלורי יומי' },
  { from: 'גירעון של 700 קלוריות שבועיים', to: 'גירעון קלורי שבועיים רצופים' },
  { from: 'גירעון של 800 קלוריות', to: 'שמור על גירעון קלורי יומי' },
  { from: 'גירעון של 900 קלוריות חודש', to: 'גירעון קלורי חודש שלם' },
  { from: 'עודף קלורי מבוקר שבוע', to: 'שמור על עודף קלורי יומי' },
  { from: 'עודף של 500 קלוריות', to: 'שמור על עודף קלורי יומי' },
  { from: 'עודף קלורי חודש שלם', to: 'שמור על עודף קלורי חודש' },
  { from: 'עודף מבוקר חודשיים', to: 'עודף קלורי חודשיים רצופים' },
  { from: 'עודף קטן של 200 קלוריות', to: 'שמור על עודף קלורי קטן' },
  { from: 'תחזוקה מדויקת ±50 קלוריות', to: 'שמור על תחזוקת קלוריות' },
  { from: 'תחזוקה מדויקת ±100 קלוריות', to: 'שמור על תחזוקת קלוריות' },
  { from: 'תחזוקה מדויקת ±150 קלוריות', to: 'שמור על תחזוקת קלוריות' },
  { from: 'תחזוקה מדויקת שבוע', to: 'שמור על תחזוקת קלוריות שבוע' },
];

calorieTitleUpdates.forEach(({ from, to }) => {
  content = content.replace(new RegExp(from, 'g'), to);
});

// Update descriptions to be more generic
const descUpdates = [
  { from: 'חלבון גבוה מאוד', to: 'שמור על היעד שלך' },
  { from: 'חלבון גבוה לשמירה על שריר', to: 'שמור על היעד שלך' },
  { from: 'חלבון גבוה לשריר', to: 'שמור על היעד שלך' },
  { from: 'חלבון לבניית שריר', to: 'שמור על היעד שלך' },
  { from: 'חלבון מסיבי', to: 'שמור על היעד שלך' },
  { from: 'חלבון של חיה', to: 'שמור על היעד שלך' },
  { from: 'חלבון ברמת עילית', to: 'שמור על היעד שלך' },
  { from: 'חלבון ברמת אליפות', to: 'שמור על היעד שלך' },
  { from: 'חלבון אולטרה גבוה', to: 'שמור על היעד שלך' },
  { from: 'שריפת שומן מהירה יותר', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'קאט אגרסיבי מאוד', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'קאט קיצוני לספורטאים', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'גירעון אגרסיבי ובטוח', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'עודף קטן = פחות שומן', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'בלק אגרסיבי', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'בלק ארוך טווח', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'בלק ארוך וממושמע', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'בניית שריר ללא שומן', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'דיוק מקסימלי', to: 'אכול לפי יעד הקלוריות היומי שלך' },
  { from: 'שליטה מוחלטת', to: 'אכול לפי יעד הקלוריות היומי שלך' },
];

descUpdates.forEach(({ from, to }) => {
  content = content.replace(new RegExp(from, 'g'), to);
});

fs.writeFileSync(templatesPath, content, 'utf8');
console.log('✅ Successfully updated templates with dynamic targets');
