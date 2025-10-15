/**
 * Workout Plan Text Parser
 * Converts legacy Hebrew text format to normalized workout structure
 *
 * Input format:
 * ```
 * יום 1: Upper Body
 * 1. לחיצת חזה במשקולות - 3 סטים × 10-12 חזרות
 * 2. משיכות גב - 3 סטים × 8-10 חזרות
 * סה"כ סטים באימון: 15
 * order: 1
 *
 * יום 2: Lower Body
 * ...
 * ```
 */

export interface ParsedExercise {
  name: string;
  sets: number | null;
  reps: string | null;
  orderIndex: number;
}

export interface ParsedWorkout {
  dayNumber: number;
  title: string;
  exercises: ParsedExercise[];
}

export interface ParsedProgram {
  workouts: ParsedWorkout[];
  totalDays: number;
}

/**
 * Parse a Hebrew workout plan text into structured data
 */
export function parseWorkoutPlanText(text: string): ParsedProgram {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid workout plan text");
  }

  const workouts: ParsedWorkout[] = [];

  // Split by day headers: "יום 1: Title" or "יום 1 : Title"
  // Regex: ^יום\s+(\d+)\s*:\s*(.+)$
  const dayHeaderRegex = /^יום\s+(\d+)\s*:\s*(.+)$/gmu;

  // Find all day headers and their positions
  const dayMatches: Array<{ dayNumber: number; title: string; startIndex: number }> = [];
  let match;

  while ((match = dayHeaderRegex.exec(text)) !== null) {
    dayMatches.push({
      dayNumber: parseInt(match[1], 10),
      title: match[2].trim(),
      startIndex: match.index,
    });
  }

  if (dayMatches.length === 0) {
    // No days found - return empty
    return { workouts: [], totalDays: 0 };
  }

  // Extract content for each day
  for (let i = 0; i < dayMatches.length; i++) {
    const currentDay = dayMatches[i];
    const nextDay = dayMatches[i + 1];

    // Get text between this day and next day (or end of string)
    const dayContent = text.substring(
      currentDay.startIndex,
      nextDay ? nextDay.startIndex : text.length
    );

    // Parse exercises from this day's content
    const exercises = parseExercisesFromDayContent(dayContent);

    workouts.push({
      dayNumber: currentDay.dayNumber,
      title: currentDay.title,
      exercises,
    });
  }

  // Sort by day number
  workouts.sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    workouts,
    totalDays: workouts.length,
  };
}

/**
 * Parse exercises from a day's content block
 * Matches format: "1. Exercise Name - 3 סטים × 10-12 חזרות"
 */
function parseExercisesFromDayContent(content: string): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];

  // Split into lines
  const lines = content.split("\n");

  // Exercise regex: ^(\d+)\.\s+(.+?)\s*-\s*(\d+)\s*סטים\s*[×x]\s*([0-9\-–]+)\s*חזרות
  // Groups: 1=order, 2=name, 3=sets, 4=reps
  const exerciseRegex = /^(\d+)\.\s+(.+?)\s*-\s*(\d+)\s*סטים\s*[×xX]\s*([0-9\-–]+)\s*חזרות/;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and summary lines
    if (!trimmedLine) continue;
    if (trimmedLine.startsWith("סה\"כ")) continue;
    if (trimmedLine.startsWith("order:")) continue;
    if (trimmedLine.startsWith("יום")) continue;

    // Try to match exercise pattern
    const match = trimmedLine.match(exerciseRegex);
    if (match) {
      const orderIndex = parseInt(match[1], 10);
      const name = match[2].trim();
      const sets = parseInt(match[3], 10);
      const reps = match[4].trim();

      exercises.push({
        name,
        sets,
        reps,
        orderIndex,
      });
    }
  }

  return exercises;
}

/**
 * Validate parsed program structure
 */
export function validateParsedProgram(parsed: ParsedProgram): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!parsed.workouts || parsed.workouts.length === 0) {
    errors.push("No workouts found");
  }

  for (const workout of parsed.workouts) {
    if (!workout.title) {
      errors.push(`Day ${workout.dayNumber}: Missing title`);
    }

    if (workout.exercises.length === 0) {
      errors.push(`Day ${workout.dayNumber}: No exercises found`);
    }

    // Check for duplicate order indices
    const orderIndices = workout.exercises.map((e) => e.orderIndex);
    const uniqueIndices = new Set(orderIndices);
    if (uniqueIndices.size !== orderIndices.length) {
      errors.push(`Day ${workout.dayNumber}: Duplicate exercise order indices`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a title for a program based on goal
 */
export function generateProgramTitle(goal?: string): string {
  const goalMap: Record<string, string> = {
    gain: "תוכנית אימון – מסה",
    loss: "תוכנית אימון – חיטוב",
    recomp: "תוכנית אימון – ריקומפ",
  };

  return goal && goalMap[goal] ? goalMap[goal] : "תוכנית אימון שלי";
}
