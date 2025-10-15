-- Seed 8 Hebrew stages for GymBro Journey Map

INSERT INTO "stage_library" ("code", "order_index", "title_he", "summary_he", "type", "requirements", "xp_reward", "icon", "bg_color") VALUES

-- Stage 1: Foundation
('foundation', 1, 'בסיס', 'להיכנס לקצב: 3 אימונים בשבוע ו־2 שקילות', 'mixed',
'{"logic": "AND", "rules": [{"metric": "workouts_per_week", "gte": 3, "window_days": 7}, {"metric": "weigh_ins", "gte": 2, "window_days": 7}]}'::jsonb,
80, '💪', '#E2F163'),

-- Stage 2: Daily Discipline  
('daily_discipline', 2, 'משמעת יומית', 'תיעוד תזונה יומי קצר', 'habit',
'{"logic": "OR", "rules": [{"metric": "nutrition_adherence_pct", "gte": 70, "window_days": 7}, {"metric": "protein_avg_g", "gte": 110, "window_days": 7}]}'::jsonb,
100, '📝', '#66D08C'),

-- Stage 3: Volume Jump
('volume_jump', 3, 'קפיצת מדרגה', 'להגיע ל־4 אימונים בשבוע', 'workout',
'{"logic": "AND", "rules": [{"metric": "workouts_per_week", "gte": 4, "window_days": 7}]}'::jsonb,
120, '🏋️', '#FFB020'),

-- Stage 4: Upper Iron
('upper_iron', 4, 'ברזל עליון', 'שיפור כוח פלג גוף עליון', 'workout',
'{"logic": "AND", "rules": [{"metric": "upper_body_workouts", "gte": 2, "window_days": 7}]}'::jsonb,
140, '💪', '#E2F163'),

-- Stage 5: Nutrition Lock
('nutrition_lock', 5, 'שומרים על תזונה', 'עמידה ב־80% תפריט שבועי', 'nutrition',
'{"logic": "AND", "rules": [{"metric": "nutrition_adherence_pct", "gte": 80, "window_days": 14}, {"metric": "weigh_ins", "gte": 2, "window_days": 7}]}'::jsonb,
160, '🥗', '#66D08C'),

-- Stage 6: Smart Endurance
('smart_endurance', 6, 'סיבולת חכמה', '60 דקות קרדיו בשבוע', 'habit',
'{"logic": "AND", "rules": [{"metric": "cardio_minutes", "gte": 60, "window_days": 7}]}'::jsonb,
120, '🏃', '#FFB020'),

-- Stage 7: Iron Mindset
('iron_mindset', 7, 'תודעת ברזל', 'רצף תיעוד של 10 ימים', 'habit',
'{"logic": "AND", "rules": [{"metric": "log_streak_days", "gte": 10}]}'::jsonb,
180, '🔥', '#E2F163'),

-- Stage 8: Boss Stage
('boss_stage', 8, 'שלב הבוס 💪', 'יעד אישי לפי מטרה', 'mixed',
'{"logic": "OR", "rules": [{"metric": "protein_avg_g", "gte": 130, "window_days": 7}, {"metric": "kcal_deficit_avg", "gte": 300, "window_days": 7}]}'::jsonb,
250, '👑', '#FF5A5A');
