/**
 * Test Data Generator
 * Generates 50 varied user profiles for automated registration testing
 */

// Production guard: prevent running in production environment
if (process.env.NODE_ENV === 'production') {
  throw new Error('scripts/test-data-generator.ts cannot run in production (NODE_ENV=production).');
}

export interface TestUserProfile {
  id: number;
  email: string;
  password: string;

  // Demographics
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  birthdate: string;
  bmi: number;

  // Fitness Profile
  goal: string; // Hebrew
  goals: string[]; // Array format for onboarding
  experience: 'never' | 'time' | 'sure' | 'results' | 'knowledge';
  training_frequency_actual: 'low' | 'medium' | 'high';

  // Dietary
  diet: 'vegan' | 'vegetarian' | 'keto' | 'balanced' | 'paleo';

  // Other
  motivation: string;
  pace: string;
  activity: string;

  // Metadata
  category: string; // For reporting: 'happy_path', 'edge_case', etc.
}

// Hebrew mappings
const GOAL_HE_MAP = {
  loss: 'ירידה במשקל',
  gain: 'עלייה במסת שריר',
  recomp: 'ריקומפוזיציה',
  maintain: 'שמירה על משקל',
};

const EXPERIENCE_HE_MAP = {
  never: 'never',
  time: 'time',
  sure: 'sure',
  results: 'results',
  knowledge: 'knowledge',
};

const DIET_HE_MAP = {
  vegan: 'טבעוני',
  vegetarian: 'צמחוני',
  keto: 'קטו',
  balanced: 'מאוזן',
  paleo: 'פליאו',
};

const ACTIVITY_LEVEL_HE_MAP = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
};

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array
 */
function randomPick<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Pick item based on weighted distribution
 */
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }

  return items[items.length - 1];
}

/**
 * Calculate BMI
 */
function calculateBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100;
  return Math.round((weight_kg / (height_m * height_m)) * 10) / 10;
}

/**
 * Generate birthdate from age
 */
function generateBirthdate(age: number): string {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = randomInt(1, 12);
  const birthDay = randomInt(1, 28); // Safe day for all months

  return `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
}

/**
 * Generate target weight based on goal
 */
function generateTargetWeight(
  currentWeight: number,
  goal: string,
  category: string
): number {
  if (category === 'edge_case') {
    // Large weight changes
    if (goal === 'loss') return Math.max(45, currentWeight - randomInt(30, 50));
    if (goal === 'gain') return Math.min(150, currentWeight + randomInt(15, 30));
  }

  // Normal ranges
  if (goal === 'loss') return Math.max(45, currentWeight - randomInt(5, 20));
  if (goal === 'gain') return Math.min(150, currentWeight + randomInt(5, 15));
  if (goal === 'recomp') return currentWeight + randomInt(-3, 3);
  if (goal === 'maintain') return currentWeight;

  return currentWeight;
}

/**
 * Generate 50 test user profiles with varied data
 */
export function generateTestUsers(): TestUserProfile[] {
  const users: TestUserProfile[] = [];

  // Test password from environment or default
  const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123!';

  // Distribution targets
  const goalDistribution = [
    { goal: 'loss', count: 20 },      // 40%
    { goal: 'gain', count: 15 },      // 30%
    { goal: 'recomp', count: 10 },    // 20%
    { goal: 'maintain', count: 5 },   // 10%
  ];

  const experienceLevels: Array<'never' | 'time' | 'sure' | 'results' | 'knowledge'> = [
    'never', 'time', 'sure', 'results', 'knowledge'
  ];

  const dietDistribution = [
    { diet: 'balanced', count: 25 },     // 50%
    { diet: 'vegetarian', count: 10 },   // 20%
    { diet: 'vegan', count: 8 },         // 16%
    { diet: 'keto', count: 5 },          // 10%
    { diet: 'paleo', count: 2 },         // 4%
  ];

  const frequencyDistribution: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  let userId = 1;

  // Generate users according to goal distribution
  for (const { goal, count } of goalDistribution) {
    for (let i = 0; i < count; i++) {
      const isEdgeCase = i < 2; // First 2 of each goal are edge cases
      const category = isEdgeCase ? 'edge_case' : 'happy_path';

      // Demographics
      const gender = randomPick(['male', 'female'] as const);
      const age = isEdgeCase
        ? randomPick([18, 19, 62, 65])
        : randomInt(20, 60);

      const height_cm = isEdgeCase
        ? randomPick([150, 152, 198, 200])
        : randomInt(155, 195);

      const weight_kg = isEdgeCase
        ? (gender === 'female' ? randomInt(45, 50) : randomInt(48, 55))
        : (gender === 'female' ? randomInt(50, 90) : randomInt(60, 120));

      const target_weight_kg = generateTargetWeight(weight_kg, goal, category);
      const birthdate = generateBirthdate(age);
      const bmi = calculateBMI(weight_kg, height_cm);

      // Fitness Profile
      const experience = experienceLevels[userId % experienceLevels.length];
      const training_frequency_actual = weightedPick(
        frequencyDistribution,
        [0.3, 0.4, 0.3]
      );

      // Dietary
      const dietItem = dietDistribution.find(() => Math.random() < 0.5) || dietDistribution[0];
      const diet = dietItem.diet as 'vegan' | 'vegetarian' | 'keto' | 'balanced' | 'paleo';

      // Generate user profile
      users.push({
        id: userId,
        email: `test${userId}@gymbro-test.com`,
        password: TEST_PASSWORD,

        // Demographics
        gender,
        age,
        height_cm,
        weight_kg,
        target_weight_kg,
        birthdate,
        bmi,

        // Fitness Profile
        goal: GOAL_HE_MAP[goal as keyof typeof GOAL_HE_MAP],
        goals: [goal],
        experience,
        training_frequency_actual,

        // Dietary
        diet,

        // Other
        motivation: `Test motivation for user ${userId}`,
        pace: randomPick(['fast', 'moderate', 'slow']),
        activity: ACTIVITY_LEVEL_HE_MAP[training_frequency_actual],

        // Metadata
        category,
      });

      userId++;
    }
  }

  return users;
}

/**
 * Get onboarding data format for a test user
 */
export function getOnboardingData(user: TestUserProfile): Record<string, any> {
  return {
    gender: user.gender,
    goals: user.goals,
    training_frequency_actual: user.training_frequency_actual,
    experience: user.experience,
    diet: user.diet,
    motivation: user.motivation,
    height_cm: user.height_cm,
    weight_kg: user.weight_kg,
    bmi: user.bmi,
    birthdate: user.birthdate,
    target_weight_kg: user.target_weight_kg,
    pace: user.pace,
    activity: user.activity,
    notifications_opt_in: true,
  };
}

/**
 * Get nutrition API request format for a test user
 */
export function getNutritionRequest(user: TestUserProfile): Record<string, any> {
  const genderHe = user.gender === 'male' ? 'זכר' : 'נקבה';

  return {
    gender_he: genderHe,
    age: user.age,
    height_cm: user.height_cm,
    weight_kg: user.weight_kg,
    target_weight_kg: user.target_weight_kg,
    activity_level_he: user.activity,
    goal_he: user.goal,
    diet_type_he: DIET_HE_MAP[user.diet],
    days: 1,
  };
}

/**
 * Print summary of generated users
 */
export function printUserSummary(users: TestUserProfile[]): void {
  console.log('\n📊 Test User Generation Summary\n');
  console.log(`Total Users: ${users.length}\n`);

  // Goal distribution
  const goalCounts: Record<string, number> = {};
  users.forEach(u => {
    goalCounts[u.goals[0]] = (goalCounts[u.goals[0]] || 0) + 1;
  });
  console.log('Goals:');
  Object.entries(goalCounts).forEach(([goal, count]) => {
    console.log(`  ${goal}: ${count} (${Math.round(count / users.length * 100)}%)`);
  });

  // Experience distribution
  const expCounts: Record<string, number> = {};
  users.forEach(u => {
    expCounts[u.experience] = (expCounts[u.experience] || 0) + 1;
  });
  console.log('\nExperience:');
  Object.entries(expCounts).forEach(([exp, count]) => {
    console.log(`  ${exp}: ${count} (${Math.round(count / users.length * 100)}%)`);
  });

  // Diet distribution
  const dietCounts: Record<string, number> = {};
  users.forEach(u => {
    dietCounts[u.diet] = (dietCounts[u.diet] || 0) + 1;
  });
  console.log('\nDiet:');
  Object.entries(dietCounts).forEach(([diet, count]) => {
    console.log(`  ${diet}: ${count} (${Math.round(count / users.length * 100)}%)`);
  });

  // Categories
  const categoryCounts: Record<string, number> = {};
  users.forEach(u => {
    categoryCounts[u.category] = (categoryCounts[u.category] || 0) + 1;
  });
  console.log('\nCategories:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} (${Math.round(count / users.length * 100)}%)`);
  });

  // Demographics ranges
  const ages = users.map(u => u.age);
  const heights = users.map(u => u.height_cm);
  const weights = users.map(u => u.weight_kg);

  console.log('\nDemographics Ranges:');
  console.log(`  Age: ${Math.min(...ages)} - ${Math.max(...ages)} years`);
  console.log(`  Height: ${Math.min(...heights)} - ${Math.max(...heights)} cm`);
  console.log(`  Weight: ${Math.min(...weights)} - ${Math.max(...weights)} kg`);

  console.log('\n');
}
