/**
 * Deterministic days-to-goal estimation
 * No LLM involved - pure calculation based on user profile
 */

export interface DaysEstimateParams {
  gender: "male" | "female";
  age: number;
  weight: number; // kg
  targetWeight: number; // kg
  heightCm: number;
  goal: "loss" | "gain" | "muscle" | "maintain";
  activityLevel: "beginner" | "intermediate" | "advanced";
}

/**
 * Calculate BMI from weight and height
 */
function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Estimate weekly rate of change (kg/week) based on goal and profile
 */
function estimateWeeklyRate(
  goal: string,
  bmi: number,
  activityLevel: string,
  gender: string
): number {
  if (goal === "maintain") {
    return 0;
  }

  if (goal === "loss") {
    // Base rate depends on BMI
    let rate = 0.4; // Default for normal BMI
    if (bmi > 30) {
      rate = 0.9; // Higher rate for obese
    } else if (bmi > 25) {
      rate = 0.6; // Moderate rate for overweight
    }

    // Adjust for activity level
    if (activityLevel === "advanced") {
      rate += 0.1;
    } else if (activityLevel === "beginner") {
      rate -= 0.1;
    }

    return Math.max(rate, 0.1); // Minimum 0.1 kg/week
  }

  if (goal === "gain" || goal === "muscle") {
    let rate = 0.3; // Base rate
    if (activityLevel === "advanced") {
      rate = 0.4;
    }
    if (gender === "female") {
      rate -= 0.05; // Slightly slower for females
    }
    return Math.max(rate, 0.1); // Minimum 0.1 kg/week
  }

  return 0.5; // Fallback
}

/**
 * Main function: calculate days to goal
 * Returns an integer number of days (deterministic, no LLM)
 */
export function calcDaysToGoal(params: DaysEstimateParams): number {
  const { gender, age, weight, targetWeight, heightCm, goal, activityLevel } = params;

  // Calculate BMI
  const bmi = calculateBMI(weight, heightCm);

  // For maintenance, return 30 days (arbitrary planning period)
  if (goal === "maintain") {
    return 30;
  }

  // Calculate weekly rate
  const weeklyRate = estimateWeeklyRate(goal, bmi, activityLevel, gender);

  // Calculate weight delta
  const delta = Math.abs(targetWeight - weight);

  // Calculate days (ensure we don't divide by zero)
  const safeWeeklyRate = Math.max(weeklyRate, 0.1);
  let days = (delta / safeWeeklyRate) * 7;

  // Age adjustment: older users progress slower
  if (age >= 55) {
    days *= 1.15;
  } else if (age >= 45) {
    days *= 1.08;
  }

  // Clamp to reasonable bounds
  const largeChange = delta > 50;
  const minDays = largeChange ? 60 : 30;
  const maxDays = largeChange ? 700 : 500;

  days = Math.max(minDays, Math.min(maxDays, days));

  return Math.round(days);
}
