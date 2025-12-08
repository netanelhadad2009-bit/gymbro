import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';
import {
  Map,
  ChevronDown,
  Flame,
  Trophy,
  Lock,
  Check,
  Zap,
  Scale,
  Utensils,
  TrendingUp,
  Calendar,
  X,
  ChevronLeft,
} from 'lucide-react-native';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface StageTask {
  id: string;
  user_stage_id: string;
  order_index: number;
  key_code: string;
  title_he: string;
  desc_he?: string;
  points: number;
  condition_json: any;
  is_completed: boolean;
  progress: number;
  canComplete: boolean;
  current?: number;
  target?: number;
}

interface Stage {
  id: string;
  user_id: string;
  stage_index: number;
  code: string;
  title_he: string;
  subtitle_he?: string;
  color_hex: string;
  is_unlocked: boolean;
  is_completed: boolean;
  tasks: StageTask[];
}

// Get task icon based on key code
function getTaskIcon(keyCode: string, color: string, size: number = 24) {
  if (keyCode.includes('WEIGH') || keyCode.includes('SCALE')) {
    return <Scale size={size} color={color} />;
  }
  if (keyCode.includes('MEAL') || keyCode.includes('LOG')) {
    return <Utensils size={size} color={color} />;
  }
  if (keyCode.includes('PROTEIN') || keyCode.includes('MACRO')) {
    return <TrendingUp size={size} color={color} />;
  }
  if (keyCode.includes('STREAK') || keyCode.includes('DAYS')) {
    return <Calendar size={size} color={color} />;
  }
  return <Zap size={size} color={color} />;
}

// Get orb state
function getOrbState(task: StageTask, stageUnlocked: boolean): 'LOCKED' | 'ACTIVE' | 'COMPLETED' {
  if (task.is_completed) return 'COMPLETED';
  if (!stageUnlocked) return 'LOCKED';
  return 'ACTIVE';
}

// Calculate zigzag position
function getOrbPosition(index: number): { xOffset: number } {
  const pattern = [0, 1, -1, 0]; // center, right, left, center
  const xMultiplier = pattern[index % 4];
  return { xOffset: xMultiplier * 50 };
}

// Orb Node Component
function OrbNode({
  task,
  stageUnlocked,
  stageColor,
  index,
  onPress,
}: {
  task: StageTask;
  stageUnlocked: boolean;
  stageColor: string;
  index: number;
  onPress: () => void;
}) {
  const state = getOrbState(task, stageUnlocked);
  const { xOffset } = getOrbPosition(index);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'ACTIVE') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [state]);

  const orbColor = state === 'COMPLETED'
    ? colors.semantic.success
    : state === 'ACTIVE'
    ? stageColor
    : colors.text.tertiary;

  const iconColor = state === 'LOCKED' ? colors.text.tertiary : colors.text.primary;

  return (
    <View style={[styles.orbContainer, { marginLeft: xOffset }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        disabled={state === 'LOCKED'}
      >
        <Animated.View
          style={[
            styles.orbOuter,
            {
              borderColor: orbColor,
              transform: [{ scale: state === 'ACTIVE' ? pulseAnim : 1 }],
            },
          ]}
        >
          <View
            style={[
              styles.orbInner,
              {
                backgroundColor: state === 'COMPLETED'
                  ? `${colors.semantic.success}20`
                  : state === 'ACTIVE'
                  ? `${stageColor}15`
                  : colors.background.card,
              },
            ]}
          >
            {state === 'COMPLETED' ? (
              <Check size={32} color={colors.semantic.success} />
            ) : state === 'LOCKED' ? (
              <Lock size={28} color={colors.text.tertiary} />
            ) : (
              getTaskIcon(task.key_code, iconColor, 28)
            )}
          </View>
        </Animated.View>

        {/* Progress ring for active tasks */}
        {state === 'ACTIVE' && task.progress > 0 && task.progress < 1 && (
          <View style={styles.progressRing}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${task.progress * 100}%`,
                  backgroundColor: stageColor,
                }
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Task title */}
      <Text
        style={[
          styles.orbTitle,
          state === 'LOCKED' && styles.orbTitleLocked,
        ]}
        numberOfLines={2}
      >
        {task.title_he}
      </Text>

      {/* Points badge */}
      <View style={[styles.pointsBadge, { backgroundColor: `${orbColor}20` }]}>
        <Text style={[styles.pointsText, { color: orbColor }]}>
          +{task.points}
        </Text>
      </View>
    </View>
  );
}

// Connector line between orbs
function OrbConnector({
  fromIndex,
  isActive
}: {
  fromIndex: number;
  isActive: boolean;
}) {
  const fromPos = getOrbPosition(fromIndex);
  const toPos = getOrbPosition(fromIndex + 1);
  const deltaX = toPos.xOffset - fromPos.xOffset;

  return (
    <View style={styles.connectorContainer}>
      <View
        style={[
          styles.connector,
          {
            backgroundColor: isActive ? colors.accent.lime : colors.border.primary,
            transform: [{ rotate: deltaX > 0 ? '15deg' : deltaX < 0 ? '-15deg' : '0deg' }],
          },
        ]}
      />
    </View>
  );
}

// Stage Picker Sheet
function StagePickerSheet({
  visible,
  stages,
  selectedIndex,
  activeIndex,
  onSelect,
  onClose,
}: {
  visible: boolean;
  stages: Stage[];
  selectedIndex: number;
  activeIndex: number | null;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={styles.sheetBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>בחרו שלב</Text>
            <Text style={styles.sheetSubtitle}>עברו בין שלבי המסע שלכם</Text>
          </View>

          <ScrollView style={styles.stageList}>
            {stages.map((stage, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              const completedTasks = stage.tasks.filter(t => t.is_completed).length;
              const totalTasks = stage.tasks.length;

              return (
                <TouchableOpacity
                  key={stage.id}
                  style={[
                    styles.stageItem,
                    isSelected && styles.stageItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(index);
                    onClose();
                  }}
                >
                  <View style={styles.stageItemLeft}>
                    <View
                      style={[
                        styles.stageIcon,
                        { backgroundColor: `${stage.color_hex}20` },
                      ]}
                    >
                      {stage.is_completed ? (
                        <Check size={20} color={colors.semantic.success} />
                      ) : !stage.is_unlocked ? (
                        <Lock size={20} color={colors.text.tertiary} />
                      ) : (
                        <Map size={20} color={stage.color_hex} />
                      )}
                    </View>
                    <View style={styles.stageInfo}>
                      <Text style={styles.stageTitle}>{stage.title_he}</Text>
                      {stage.subtitle_he && (
                        <Text style={styles.stageSubtitle}>{stage.subtitle_he}</Text>
                      )}
                      <Text style={styles.stageProgress}>
                        {stage.is_completed
                          ? 'כל המשימות הושלמו'
                          : `${completedTasks} מתוך ${totalTasks} משימות הושלמו`
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stageItemRight}>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>פעיל</Text>
                      </View>
                    )}
                    <ChevronLeft size={20} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Task Detail Sheet
function TaskDetailSheet({
  visible,
  task,
  stageColor,
  onClose,
  onComplete,
  completing,
}: {
  visible: boolean;
  task: StageTask | null;
  stageColor: string;
  onClose: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={styles.sheetBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.taskDetailContent}>
            {/* Task Icon */}
            <View style={[styles.taskIconLarge, { backgroundColor: `${stageColor}20` }]}>
              {task.is_completed ? (
                <Check size={40} color={colors.semantic.success} />
              ) : (
                getTaskIcon(task.key_code, stageColor, 40)
              )}
            </View>

            {/* Title & Points */}
            <Text style={styles.taskDetailTitle}>{task.title_he}</Text>
            <View style={styles.taskPointsRow}>
              <Trophy size={16} color={colors.accent.primary} />
              <Text style={styles.taskPointsText}>+{task.points} נקודות</Text>
            </View>

            {/* Description */}
            {task.desc_he && (
              <Text style={styles.taskDescription}>{task.desc_he}</Text>
            )}

            {/* Progress */}
            {!task.is_completed && task.target && (
              <View style={styles.taskProgressSection}>
                <View style={styles.taskProgressBar}>
                  <View
                    style={[
                      styles.taskProgressFill,
                      {
                        width: `${Math.min(100, task.progress * 100)}%`,
                        backgroundColor: stageColor,
                      }
                    ]}
                  />
                </View>
                <Text style={styles.taskProgressText}>
                  {task.current || 0} / {task.target}
                </Text>
              </View>
            )}

            {/* Action Button */}
            {task.is_completed ? (
              <View style={styles.completedBanner}>
                <Check size={20} color={colors.semantic.success} />
                <Text style={styles.completedText}>משימה הושלמה!</Text>
              </View>
            ) : task.canComplete ? (
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: stageColor }]}
                onPress={onComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <Text style={styles.completeButtonText}>השלם משימה</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.cantCompleteSection}>
                <Text style={styles.cantCompleteText}>
                  השלם את הפעולה הנדרשת כדי לסיים את המשימה
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Streak Button
function StreakButton({ streak }: { streak: number }) {
  return (
    <View style={styles.streakButton}>
      <Flame size={18} color={colors.accent.orange} />
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

// Points Card
function PointsCard({ points }: { points: number }) {
  return (
    <View style={styles.pointsCard}>
      <Trophy size={16} color={colors.accent.primary} />
      <Text style={styles.pointsCardText}>{points}</Text>
    </View>
  );
}

// Locked Stage Banner
function LockedStageBanner({ onGoToActive }: { onGoToActive: () => void }) {
  return (
    <View style={styles.lockedBanner}>
      <Lock size={24} color={colors.text.secondary} />
      <Text style={styles.lockedBannerTitle}>{texts.journey.lockedStage}</Text>
      <Text style={styles.lockedBannerDesc}>{texts.journey.lockedStageDesc}</Text>
      <TouchableOpacity style={styles.goToActiveButton} onPress={onGoToActive}>
        <Text style={styles.goToActiveText}>{texts.journey.goToActiveStage}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Main Journey Screen
export default function JourneyScreen() {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeStageIndex, setActiveStageIndex] = useState<number | null>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StageTask | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStage = stages[selectedStageIndex];

  // Fetch stages data
  const loadJourneyData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch stages with tasks
      const { data: stagesData, error: stagesError } = await supabase
        .from('user_journey_stages')
        .select(`
          *,
          tasks:user_stage_tasks(*)
        `)
        .eq('user_id', user.id)
        .order('stage_index', { ascending: true });

      if (stagesError) throw stagesError;

      if (stagesData && stagesData.length > 0) {
        // Calculate progress for each task
        const stagesWithProgress = stagesData.map(stage => ({
          ...stage,
          tasks: (stage.tasks || [])
            .sort((a: StageTask, b: StageTask) => a.order_index - b.order_index)
            .map((task: StageTask) => ({
              ...task,
              progress: task.is_completed ? 1 : 0,
              canComplete: !task.is_completed && stage.is_unlocked,
            })),
        }));

        setStages(stagesWithProgress);

        // Find active stage (first unlocked, not completed)
        const activeIdx = stagesWithProgress.findIndex(
          s => s.is_unlocked && !s.is_completed
        );
        setActiveStageIndex(activeIdx >= 0 ? activeIdx : null);
        setSelectedStageIndex(activeIdx >= 0 ? activeIdx : 0);

        // Calculate total points
        const points = stagesWithProgress.reduce((sum, stage) => {
          return sum + stage.tasks
            .filter((t: StageTask) => t.is_completed)
            .reduce((taskSum: number, t: StageTask) => taskSum + t.points, 0);
        }, 0);
        setTotalPoints(points);
      }

      // Fetch streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single();

      if (streakData) {
        setStreak(streakData.current_streak || 0);
      }

    } catch (err) {
      console.error('Error loading journey data:', err);
      setError(texts.journey.connectionError);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadJourneyData();
  }, [loadJourneyData]);

  // Complete task handler
  const handleCompleteTask = async () => {
    if (!selectedTask || !selectedStage) return;

    setCompleting(true);
    try {
      // Mark task as completed
      const { error: updateError } = await supabase
        .from('user_stage_tasks')
        .update({ is_completed: true })
        .eq('id', selectedTask.id);

      if (updateError) throw updateError;

      // Update points
      setTotalPoints(prev => prev + selectedTask.points);

      // Refresh data
      await loadJourneyData();
      setTaskDetailOpen(false);
      setSelectedTask(null);

    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Go to active stage
  const handleGoToActive = () => {
    if (activeStageIndex !== null) {
      setSelectedStageIndex(activeStageIndex);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.lime} />
          <Text style={styles.loadingText}>{texts.journey.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadJourneyData}>
            <Text style={styles.retryButtonText}>{texts.journey.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (stages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Map size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{texts.journey.noStages}</Text>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>{texts.journey.createStages}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isViewingLockedStage = selectedStage && !selectedStage.is_unlocked;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{texts.journey.title}</Text>
          <View style={styles.headerActions}>
            <StreakButton streak={streak} />
            <PointsCard points={totalPoints} />
          </View>
        </View>

        {/* Stage Selector */}
        <TouchableOpacity
          style={styles.stageSelector}
          onPress={() => setStagePickerOpen(true)}
        >
          <View
            style={[
              styles.stageDot,
              { backgroundColor: selectedStage?.color_hex || colors.accent.primary }
            ]}
          />
          <Text style={styles.stageSelectorText}>
            {selectedStage?.title_he || 'בחר שלב'}
          </Text>
          <ChevronDown size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Locked Stage Banner */}
        {isViewingLockedStage && (
          <LockedStageBanner onGoToActive={handleGoToActive} />
        )}

        {/* Orb Map */}
        {selectedStage && (
          <View style={styles.orbMap}>
            {selectedStage.tasks.map((task, index) => (
              <View key={task.id}>
                <OrbNode
                  task={task}
                  stageUnlocked={selectedStage.is_unlocked}
                  stageColor={selectedStage.color_hex}
                  index={index}
                  onPress={() => {
                    setSelectedTask(task);
                    setTaskDetailOpen(true);
                  }}
                />
                {index < selectedStage.tasks.length - 1 && (
                  <OrbConnector
                    fromIndex={index}
                    isActive={task.is_completed}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Stage Picker Sheet */}
      <StagePickerSheet
        visible={stagePickerOpen}
        stages={stages}
        selectedIndex={selectedStageIndex}
        activeIndex={activeStageIndex}
        onSelect={setSelectedStageIndex}
        onClose={() => setStagePickerOpen(false)}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        visible={taskDetailOpen}
        task={selectedTask}
        stageColor={selectedStage?.color_hex || colors.accent.primary}
        onClose={() => {
          setTaskDetailOpen(false);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
        completing={completing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Loading & Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
  },
  createButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  createButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Streak Button
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  streakText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  // Points Card
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  pointsCardText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },

  // Stage Selector
  stageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageSelectorText: {
    flex: 1,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    textAlign: 'right',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },

  // Locked Banner
  lockedBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedBannerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  lockedBannerDesc: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  goToActiveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  goToActiveText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },

  // Orb Map
  orbMap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  // Orb Node
  orbContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  orbOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    bottom: -8,
    width: 60,
    height: 4,
    backgroundColor: colors.border.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  orbTitle: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: 120,
  },
  orbTitleLocked: {
    color: colors.text.tertiary,
  },
  pointsBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pointsText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },

  // Connector
  connectorContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },

  // Bottom Sheets
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContainer: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.primary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sheetTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },

  // Stage List
  stageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stageItemSelected: {
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  stageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  stageInfo: {
    flex: 1,
  },
  stageTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  stageSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  stageProgress: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 2,
  },
  stageItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeBadge: {
    backgroundColor: `${colors.semantic.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.semantic.success,
  },

  // Task Detail
  taskDetailContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  taskIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  taskDetailTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  taskPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  taskPointsText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  taskDescription: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  taskProgressSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  taskProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border.primary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  taskProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  taskProgressText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.semantic.success}20`,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  completedText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.semantic.success,
  },
  completeButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  cantCompleteSection: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  cantCompleteText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  bottomSpacing: {
    height: 100,
  },
});
