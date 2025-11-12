# Avatar Taxonomy

This document provides a human-readable overview of all canonical avatars in the GymBro fitness app.

## Overview

The avatar system classifies users into 12 distinct personas based on their onboarding responses. Each avatar represents a unique combination of fitness goals, experience level, time commitment, and dietary preferences.

**Total Avatars:** 12
**Primary Dimensions:** Goal, Frequency, Experience, Diet
**Last Updated:** 2025-10-30

---

## Beginner Avatars

### 🌱 המתחיל בירידה (rookie-cut)
**Tagline:** התחלה חדשה לשינוי

**Who is it for:**
- Beginners with weight loss goals
- Training 2-3x per week
- New to fitness or struggling with consistency

**Training:** 3x full-body beginner programs
**Nutrition:** Moderate deficit (300-500 kcal), high protein focus
**Tone:** Supportive, educational, encouraging
**KPIs:** Weight loss, workout adherence, streak building

---

### 💪 המתחיל בעלייה (rookie-gain)
**Tagline:** בונים בסיס חזק

**Who is it for:**
- Beginners with muscle gain goals
- Training 2-3x per week
- Building foundational strength

**Training:** 3x full-body compound movements
**Nutrition:** Modest surplus (~300 kcal), high protein, whole foods
**Tone:** Supportive, educational, motivating
**KPIs:** Weight gain, strength progression, workout consistency

---

## Time-Constrained Avatars

### ⚡ העסוק בירידה (busy-3day-cut)
**Tagline:** תוצאות בזמן מינימלי

**Who is it for:**
- Busy individuals with limited time
- Weight loss goals
- Training exactly 3x per week

**Training:** 3x efficient full-body, 45-minute sessions
**Nutrition:** Moderate deficit (400-500 kcal), meal prep friendly
**Tone:** Efficient, practical, results-focused
**KPIs:** Weight loss, training efficiency, adherence

---

### 🚀 העסוק בעלייה (busy-3day-gain)
**Tagline:** מקסימום תוצאות במינימום זמן

**Who is it for:**
- Busy individuals with limited time
- Muscle gain goals
- Training exactly 3x per week

**Training:** 3x upper/lower split, compound-focused
**Nutrition:** Moderate surplus (350-400 kcal), nutrient-dense convenience foods acceptable
**Tone:** Efficient, practical, motivating
**KPIs:** Strength gains, weight gain, efficiency

---

## Regular Gym-Goers

### 🔥 הקבוע בירידה (gym-regular-cut)
**Tagline:** מסור למטרה

**Who is it for:**
- Consistent gym-goers (4-5x per week)
- Weight loss with muscle retention
- Previous training experience

**Training:** 4-5x upper/lower or push/pull/legs split
**Nutrition:** Moderate to aggressive deficit (500-600 kcal), high protein (2g/kg), optional carb cycling
**Tone:** Motivating, analytical, performance-focused
**KPIs:** Weight loss, body composition, strength retention

---

### 💎 הקבוע בעלייה (gym-regular-gain)
**Tagline:** בונה גוף חלומות

**Who is it for:**
- Consistent gym-goers (4-5x per week)
- Muscle gain goals
- Previous training experience

**Training:** 4-5x push/pull/legs or upper/lower split
**Nutrition:** Controlled surplus (400-500 kcal), high protein (2g/kg), nutrient timing emphasized
**Tone:** Motivating, analytical, performance-focused
**KPIs:** Weight gain, strength, training volume

---

## Advanced Athletes

### 🏆 הספורטאי בחיתוך (athlete-cut)
**Tagline:** מתקדם ומחויב

**Who is it for:**
- Serious athletes (5-6x per week)
- Advanced cutting for bodybuilding/athletics
- Extensive training experience

**Training:** 5-6x body-part split or PPL + accessories
**Nutrition:** Periodized deficit, macro cycling, supplement protocol
**Tone:** Technical, performance-driven, competitive
**KPIs:** Body fat reduction, strength maintenance, conditioning

---

### 🦁 הספורטאי בבנייה (athlete-gain)
**Tagline:** בניית מסה ברמה גבוהה

**Who is it for:**
- Serious athletes (5-6x per week)
- Competitive-level muscle building
- Extensive training experience

**Training:** 5-6x body-part split, high volume progressive overload
**Nutrition:** Aggressive surplus (500-600 kcal), periodized macros, meal timing critical
**Tone:** Technical, performance-driven, competitive
**KPIs:** Weight gain, strength, volume progression, recovery

---

## Plant-Based Athletes

### 🌿 הצמחוני בירידה (plant-powered-cut)
**Tagline:** בריא וצמחי

**Who is it for:**
- Vegan/vegetarian users
- Weight loss goals
- Any training frequency

**Training:** Flexible based on frequency preference
**Nutrition:** Deficit with plant protein emphasis (tofu, tempeh, legumes), B12 supplementation, complete amino acids
**Tone:** Health-conscious, ethical, supportive
**KPIs:** Weight loss, nutrition variety, protein intake

---

### 🥬 הצמחוני בעלייה (plant-powered-gain)
**Tagline:** בונים שריר צמחי

**Who is it for:**
- Vegan/vegetarian users
- Muscle gain goals
- Any training frequency

**Training:** Flexible based on frequency preference
**Nutrition:** Surplus with diverse plant proteins, leucine-rich sources, creatine supplementation recommended
**Tone:** Health-conscious, ethical, supportive
**KPIs:** Weight gain, strength, protein adequacy

---

## Specialized Avatars

### ⚖️ השיפור המאוזן (recomp-balanced)
**Tagline:** שיפור הרכב הגוף

**Who is it for:**
- Body recomposition goal
- Maintain weight, improve composition
- Training 3-5x per week

**Training:** 3-5x progressive resistance training
**Nutrition:** Maintenance calories, high protein (2g/kg), nutrient timing around training
**Tone:** Patient, analytical, sustainable
**KPIs:** Strength gain, body composition, consistency

---

### 🔄 החוזר בירידה (comeback-cut)
**Tagline:** חזרה לכושר עם ניסיון

**Who is it for:**
- Previous experience but long break
- Weight loss goals
- Training 2-4x per week

**Training:** Progressive return to volume, 2-4x full-body or upper/lower
**Nutrition:** Moderate deficit (~400 kcal), muscle preservation focus, gradual calorie adjustment
**Tone:** Understanding, encouraging, realistic
**KPIs:** Consistency, weight loss, muscle memory activation

---

## Avatar Selection Algorithm

Avatars are matched using a weighted scoring system:

1. **Goal** - Primary filter (must match)
2. **Frequency** - Strong weight for split determination
3. **Experience** - Influences programming complexity
4. **Diet** - Binary filter for plant-based avatars

### Scoring Rules

- **Exact match** on required field: +3 points
- **Soft match** (within range): +1 point
- **Conflict** with rules: -2 points
- **Diet filter** for plant-based: Must match if user is vegan/vegetarian

### Tie-Breaking

If multiple avatars have the same score:
1. Prefer avatar with more specific rules
2. Sort alphabetically by avatar ID
3. Return first match (deterministic)

---

## Usage

See `resolveAvatar.ts` for the implementation of the matching algorithm.
See `AVATAR_README.md` for API usage and integration guide.
