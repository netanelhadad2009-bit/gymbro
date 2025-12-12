import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';
import {
  Dumbbell,
  Check,
  ChevronLeft,
  Clock,
  Target,
  Play,
  Plus,
} from 'lucide-react-native';

// Types
interface Exercise {
  id: string;
  order_index: number;
  name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
}

interface Workout {
  id: string;
  day_number: number;
  title: string;
  notes: string | null;
  completed: boolean;
  exercises: Exercise[];
}

interface Program {
  id: string;
  user_id: string;
  title: string;
  goal: 'gain' | 'loss' | 'recomp' | null;
  days_estimate: number;
  start_date: string | null;
  created_at: string;
}

interface ProgramWithWorkouts {
  program: Program;
  workouts: Workout[];
  stats: {
    total: number;
    completed: number;
    progress: number;
  };
  nextWorkout: Workout | null;
}

// Goal translations
const goalToHebrew = (goal: string | null): string => {
  switch (goal) {
    case 'gain': return 'Muscle Gain';
    case 'loss': return 'Fat Loss';
    case 'recomp': return 'Recomp';
    default: return '';
  }
};

// Progress Bar Component
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, progress)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );
}

// Workout Day Card Component
function WorkoutDayCard({
  workout,
  onPress,
}: {
  workout: Workout;
  onPress: () => void;
}) {
  const exercisePreview = workout.exercises.slice(0, 3);
  const remainingCount = workout.exercises.length - 3;

  return (
    <TouchableOpacity
      style={[
        styles.workoutCard,
        workout.completed && styles.workoutCardCompleted,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.workoutCardHeader}>
        <View style={styles.workoutDayBadge}>
          <Text style={styles.workoutDayText}>
            {texts.workouts.day} {workout.day_number}
          </Text>
        </View>
        {workout.completed && (
          <View style={styles.completedBadge}>
            <Check size={14} color={colors.semantic.success} />
            <Text style={styles.completedBadgeText}>{texts.workouts.completed}</Text>
          </View>
        )}
      </View>

      <Text style={styles.workoutTitle}>{workout.title}</Text>

      {workout.notes && (
        <Text style={styles.workoutNotes} numberOfLines={1}>
          {workout.notes}
        </Text>
      )}

      <View style={styles.exercisesList}>
        {exercisePreview.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseItem}>
            <View style={styles.exerciseDot} />
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exercise.name}
            </Text>
            {exercise.sets && exercise.reps && (
              <Text style={styles.exerciseDetails}>
                {exercise.sets}×{exercise.reps}
              </Text>
            )}
          </View>
        ))}
        {remainingCount > 0 && (
          <Text style={styles.moreExercises}>
            +{remainingCount} {texts.workouts.exercises}
          </Text>
        )}
      </View>

      <View style={styles.workoutCardFooter}>
        <View style={styles.exerciseCount}>
          <Dumbbell size={14} color={colors.text.tertiary} />
          <Text style={styles.exerciseCountText}>
            {workout.exercises.length} {texts.workouts.exercisesCount}
          </Text>
        </View>
        <ChevronLeft size={18} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
}

// Program Header Card
function ProgramHeader({
  program,
  stats,
  nextWorkout,
  onStartWorkout,
}: {
  program: Program;
  stats: { total: number; completed: number; progress: number };
  nextWorkout: Workout | null;
  onStartWorkout: () => void;
}) {
  return (
    <View style={styles.programCard}>
      <View style={styles.programHeader}>
        <View style={styles.programInfo}>
          <Text style={styles.programTitle}>{program.title}</Text>
          {program.goal && (
            <Text style={styles.programGoal}>{goalToHebrew(program.goal)}</Text>
          )}
        </View>
        <View style={styles.programIcon}>
          <Target size={24} color={colors.accent.primary} />
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>{texts.workouts.progress}</Text>
        <ProgressBar progress={stats.progress} color={colors.accent.primary} />
        <Text style={styles.statsText}>
          {stats.completed} / {stats.total} {texts.workouts.workoutsCompleted}
        </Text>
      </View>

      {nextWorkout && !nextWorkout.completed && (
        <TouchableOpacity
          style={styles.startWorkoutButton}
          onPress={onStartWorkout}
        >
          <Play size={18} color={colors.background.primary} />
          <Text style={styles.startWorkoutText}>
            {texts.workouts.continueWorkout}: {texts.workouts.day} {nextWorkout.day_number}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Dumbbell size={48} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>{texts.workouts.noPrograms}</Text>
      <Text style={styles.emptyDescription}>{texts.workouts.noProgramsDesc}</Text>
      <TouchableOpacity style={styles.createProgramButton}>
        <Plus size={20} color={colors.background.primary} />
        <Text style={styles.createProgramText}>{texts.workouts.createProgram}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Main Workouts Screen
export default function WorkoutsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState<ProgramWithWorkouts | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch program data
  const loadWorkoutsData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch latest program with workouts
      const { data: programs, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (programError) throw programError;

      if (!programs || programs.length === 0) {
        setProgramData(null);
        setLoading(false);
        return;
      }

      const program = programs[0];

      // Fetch workouts with exercises
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          exercises:workout_exercises(*)
        `)
        .eq('program_id', program.id)
        .order('day_number', { ascending: true });

      if (workoutsError) throw workoutsError;

      // Sort exercises within each workout
      const sortedWorkouts = (workouts || []).map(workout => ({
        ...workout,
        exercises: (workout.exercises || []).sort(
          (a: Exercise, b: Exercise) => a.order_index - b.order_index
        ),
      }));

      // Calculate stats
      const total = sortedWorkouts.length;
      const completed = sortedWorkouts.filter(w => w.completed).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      // Find next workout (first uncompleted)
      const nextWorkout = sortedWorkouts.find(w => !w.completed) || null;

      setProgramData({
        program,
        workouts: sortedWorkouts,
        stats: { total, completed, progress },
        nextWorkout,
      });

    } catch (err) {
      console.error('Error loading workouts:', err);
      setError('Error loading workouts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkoutsData();
  }, [loadWorkoutsData]);

  const handleStartWorkout = () => {
    // TODO: Navigate to workout session screen
    console.log('Start workout:', programData?.nextWorkout?.id);
  };

  const handleWorkoutPress = (workout: Workout) => {
    // TODO: Navigate to workout detail screen
    console.log('View workout:', workout.id);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.lime} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWorkoutsData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{texts.workouts.title}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!programData ? (
          <EmptyState />
        ) : (
          <>
            {/* Program Overview */}
            <View style={styles.section}>
              <ProgramHeader
                program={programData.program}
                stats={programData.stats}
                nextWorkout={programData.nextWorkout}
                onStartWorkout={handleStartWorkout}
              />
            </View>

            {/* Workouts List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{texts.workouts.myWorkouts}</Text>
              <View style={styles.workoutsList}>
                {programData.workouts.map((workout) => (
                  <WorkoutDayCard
                    key={workout.id}
                    workout={workout}
                    onPress={() => handleWorkoutPress(workout)}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  retryButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },

  // Program Card
  programCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  programGoal: {
    fontSize: typography.size.sm,
    color: colors.accent.primary,
    textAlign: 'right',
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
    width: 45,
    textAlign: 'left',
  },
  statsText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  // Start Workout Button
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  startWorkoutText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },

  // Workouts List
  workoutsList: {
    gap: spacing.md,
  },

  // Workout Card
  workoutCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  workoutCardCompleted: {
    opacity: 0.7,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  workoutDayBadge: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  workoutDayText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedBadgeText: {
    fontSize: typography.size.xs,
    color: colors.semantic.success,
    fontWeight: typography.weight.medium,
  },
  workoutTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  workoutNotes: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },

  // Exercises List
  exercisesList: {
    marginBottom: spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.lime,
    marginLeft: spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  exerciseDetails: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  moreExercises: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Workout Card Footer
  workoutCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseCountText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    marginTop: spacing['4xl'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  createProgramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  createProgramText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },

  bottomSpacing: {
    height: 100,
  },
});
