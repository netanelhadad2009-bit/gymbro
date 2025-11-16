/**
 * Generate Journey Stage & Task Templates for All Avatars
 * Run: tsx apps/web/scripts/journey/generateTemplates.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Avatar definitions (from AVATAR_TAXONOMY.json)
const AVATARS = [
  'rookie-cut', 'rookie-gain',
  'busy-3day-cut', 'busy-3day-gain',
  'gym-regular-cut', 'gym-regular-gain',
  'athlete-cut', 'athlete-gain',
  'plant-powered-cut', 'plant-powered-gain',
  'recomp-balanced', 'comeback-cut'
];

interface StageTemplate {
  id: string;
  avatar_id: string;
  order: number;
  title_he: string;
  subtitle_he: string;
  theme_color: string;
  points_total: number;
  unlock_condition: { type: string };
  success_copy_he: string;
}

interface TaskTemplate {
  id: string;
  stage_id: string;
  type: string;
  target: any;
  points: number;
  title_he: string;
  description_he?: string;
  cta_route?: string;
  auto_check_fn?: string;
}

// Generate stages for an avatar
function generateStagesForAvatar(avatarId: string): StageTemplate[] {
  const stages: StageTemplate[] = [];
  const stageCount = 3; // 3 stages per avatar
  
  const isRookie = avatarId.startsWith('rookie');
  const isBusy = avatarId.includes('busy');
  const isAthlete = avatarId.includes('athlete');
  const isPlant = avatarId.includes('plant');
  const isComeback = avatarId.includes('comeback');
  
  const baseColor = isRookie ? '#4CAF50' :
                    isBusy ? '#FF9800' :
                    isAthlete ? '#9C27B0' :
                    isPlant ? '#66BB6A' :
                    isComeback ? '#00BCD4' :
                    '#2196F3';
  
  for (let i = 1; i <= stageCount; i++) {
    const stageTitles = [
      ['צעדים ראשונים', 'יצירת משמעת', 'מעקב התקדמות'],
      ['הרגלים מינימליים', 'עקביות תזונתית', 'שליטה מלאה'],
      ['יסודות תזונה', 'אופטימיזציה', 'מעקב מתקדם']
    ];
    
    const subtitles = [
      ['להתחיל לתעד ולהבין את הדפוסים', 'עקביות במעקב קלורי וחלבון', 'לראות את השינויים בגוף'],
      ['בניית יסודות בזמן מינימלי', 'שיפור העמידה בתזונה', 'שליטה מלאה בתזונה'],
      ['בניית בסיס תזונתי חזק', 'שיפור וכוונון', 'מעקב ושיפור מתמשך']
    ];
    
    const titleSet = isBusy ? 1 : isAthlete ? 2 : 0;
    
    stages.push({
      id: `${avatarId}-stage-${i}`,
      avatar_id: avatarId,
      order: i,
      title_he: stageTitles[titleSet][i-1],
      subtitle_he: subtitles[titleSet][i-1],
      theme_color: baseColor,
      points_total: 50 + (i * 15),
      unlock_condition: { type: i === 1 ? 'first' : 'previous_complete' },
      success_copy_he: i === 1 ? 'כל הכבוד! התחלת את המסע' :
                       i === 2 ? 'מצוין! יצרת הרגלים טובים' :
                       'מדהים! אתה בדרך הנכונה'
    });
  }
  
  return stages;
}

// Generate tasks for a stage
function generateTasksForStage(stage: StageTemplate): TaskTemplate[] {
  const tasks: TaskTemplate[] = [];
  const { id: stageId, avatar_id, order } = stage;
  
  const isRookie = avatar_id.startsWith('rookie');
  const isBusy = avatar_id.includes('busy');
  const isPlant = avatar_id.includes('plant');
  const isCut = avatar_id.includes('cut');
  const isGain = avatar_id.includes('gain');
  
  // Stage 1: Basics
  if (order === 1) {
    // Task 1: Streak
    tasks.push({
      id: `${stageId}-t1`,
      stage_id: stageId,
      type: 'streak_days',
      target: { days: isRookie ? 3 : 5, rule: 'any_meal' },
      points: 20,
      title_he: `רצף תיעוד של ${isRookie ? 3 : 5} ימים`,
      description_he: 'תעד ארוחה אחת לפחות כל יום',
      cta_route: '/nutrition',
      auto_check_fn: 'checkStreakDays'
    });
    
    // Task 2: Meal logging
    tasks.push({
      id: `${stageId}-t2`,
      stage_id: stageId,
      type: 'meal_log',
      target: { count: isRookie ? 7 : 14, window: 7 },
      points: 20,
      title_he: `תיעוד ${isRookie ? 7 : 14} ארוחות`,
      description_he: 'תעד את הארוחות שלך לאורך השבוע',
      cta_route: '/nutrition',
      auto_check_fn: 'checkMealLog'
    });
    
    // Task 3: Education
    tasks.push({
      id: `${stageId}-t3`,
      stage_id: stageId,
      type: 'edu_read',
      target: { articleId: isPlant ? 'plant_protein_sources' : 'nutrition_basics' },
      points: 15,
      title_he: 'קריאת מדריך תזונה',
      description_he: isPlant ? 'למד על מקורות חלבון צמחיים' : 'למד את יסודות התזונה'
    });
  }
  
  // Stage 2: Discipline
  if (order === 2) {
    // Task 1: Calorie window
    const calorieTarget = isCut ? 1800 : isGain ? 2600 : 2200;
    tasks.push({
      id: `${stageId}-t1`,
      stage_id: stageId,
      type: 'calorie_window',
      target: { exact: calorieTarget, window: 7 },
      points: 25,
      title_he: `עמידה ב-${calorieTarget} קלוריות`,
      description_he: 'שמור על יעד הקלוריות היומי',
      cta_route: '/nutrition',
      auto_check_fn: 'checkCalorieWindow'
    });
    
    // Task 2: Protein target
    const proteinTarget = isPlant ? 100 : isCut ? 120 : 150;
    tasks.push({
      id: `${stageId}-t2`,
      stage_id: stageId,
      type: 'protein_target',
      target: { grams: proteinTarget, window: 7, avg: true },
      points: 25,
      title_he: `ממוצע של ${proteinTarget}g חלבון`,
      description_he: 'שמור על צריכת חלבון גבוהה',
      cta_route: '/nutrition',
      auto_check_fn: 'checkProteinTarget'
    });
    
    // Task 3: Habit
    tasks.push({
      id: `${stageId}-t3`,
      stage_id: stageId,
      type: 'habit_check',
      target: { days: 5, habit: isBusy ? 'הכנת ארוחות מראש' : 'תכנון תפריט שבועי' },
      points: 20,
      title_he: 'הרגל תזונתי',
      description_he: isBusy ? 'הכן ארוחות מראש לחסוך זמן' : 'תכנן את התפריט שלך מראש'
    });
  }
  
  // Stage 3: Progress tracking
  if (order === 3) {
    // Task 1: Weigh-in
    tasks.push({
      id: `${stageId}-t1`,
      stage_id: stageId,
      type: 'weigh_in',
      target: { count: 3, window: 7, trend: isCut ? 'down' : isGain ? 'up' : undefined },
      points: 20,
      title_he: 'מעקב משקל שבועי',
      description_he: 'שקול את עצמך 3 פעמים בשבוע',
      cta_route: '/progress#weight',
      auto_check_fn: 'checkWeighIn'
    });
    
    // Task 2: Protein streak
    tasks.push({
      id: `${stageId}-t2`,
      stage_id: stageId,
      type: 'streak_days',
      target: { days: 7, rule: 'protein_hit' },
      points: 30,
      title_he: 'רצף חלבון של שבוע',
      description_he: 'עמוד ביעד החלבון 7 ימים ברצף',
      cta_route: '/nutrition',
      auto_check_fn: 'checkStreakDays'
    });
    
    // Task 3: Education
    tasks.push({
      id: `${stageId}-t3`,
      stage_id: stageId,
      type: 'edu_read',
      target: { articleId: 'recovery_and_progress' },
      points: 15,
      title_he: 'למד על מעקב התקדמות',
      description_he: 'הבן כיצד למדוד התקדמות נכון'
    });
  }
  
  return tasks;
}

// Main generation function
function generateAllTemplates() {
  const allStages: StageTemplate[] = [];
  const allTasks: TaskTemplate[] = [];
  
  for (const avatarId of AVATARS) {
    const stages = generateStagesForAvatar(avatarId);
    allStages.push(...stages);
    
    for (const stage of stages) {
      const tasks = generateTasksForStage(stage);
      allTasks.push(...tasks);
    }
  }
  
  // Write to files
  const configDir = path.join(__dirname, '../../../configs/journey');
  fs.mkdirSync(configDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(configDir, 'STAGE_TEMPLATES.json'),
    JSON.stringify({ stages: allStages }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(configDir, 'TASK_TEMPLATES.json'),
    JSON.stringify({ tasks: allTasks }, null, 2)
  );
  
  console.log(`✅ Generated ${allStages.length} stage templates`);
  console.log(`✅ Generated ${allTasks.length} task templates`);
  console.log(`✅ Files written to ${configDir}`);
}

// Run generator
generateAllTemplates();
