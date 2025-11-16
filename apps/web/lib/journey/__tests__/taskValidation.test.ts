/**
 * Task Type Validation Tests
 *
 * Ensures that only allowed task types (nutrition/habits) are accepted
 * and workout tasks are rejected.
 */

import { validateTaskType, assertValidTaskType, ALLOWED_TASK_TYPES } from '../taskTypes';

describe('Task Type Validation', () => {
  describe('validateTaskType', () => {
    it('should allow all nutrition task types', () => {
      expect(validateTaskType('meal_log')).toBe(true);
      expect(validateTaskType('protein_target')).toBe(true);
      expect(validateTaskType('calorie_window')).toBe(true);
    });

    it('should allow all habit task types', () => {
      expect(validateTaskType('weigh_in')).toBe(true);
      expect(validateTaskType('streak_days')).toBe(true);
      expect(validateTaskType('habit_check')).toBe(true);
      expect(validateTaskType('edu_read')).toBe(true);
    });

    it('should allow all types from ALLOWED_TASK_TYPES constant', () => {
      ALLOWED_TASK_TYPES.forEach(type => {
        expect(validateTaskType(type)).toBe(true);
      });
    });

    it('should reject workout task types', () => {
      expect(validateTaskType('workout_count')).toBe(false);
      expect(validateTaskType('lift_target')).toBe(false);
      expect(validateTaskType('exercise_complete')).toBe(false);
      expect(validateTaskType('cardio_minutes')).toBe(false);
      expect(validateTaskType('training_volume')).toBe(false);
      expect(validateTaskType('strength_target')).toBe(false);
    });

    it('should reject invalid task types', () => {
      expect(validateTaskType('invalid')).toBe(false);
      expect(validateTaskType('random_type')).toBe(false);
      expect(validateTaskType('')).toBe(false);
      expect(validateTaskType('123')).toBe(false);
    });

    it('should reject undefined and null', () => {
      expect(validateTaskType(undefined as any)).toBe(false);
      expect(validateTaskType(null as any)).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(validateTaskType('MEAL_LOG')).toBe(false);
      expect(validateTaskType('Meal_Log')).toBe(false);
      expect(validateTaskType('meal_log')).toBe(true);
    });
  });

  describe('assertValidTaskType', () => {
    it('should not throw for valid task types', () => {
      expect(() => assertValidTaskType('meal_log')).not.toThrow();
      expect(() => assertValidTaskType('protein_target')).not.toThrow();
      expect(() => assertValidTaskType('habit_check')).not.toThrow();
    });

    it('should throw for workout task types', () => {
      expect(() => assertValidTaskType('workout_count')).toThrow();
      expect(() => assertValidTaskType('lift_target')).toThrow();
      expect(() => assertValidTaskType('exercise_complete')).toThrow();
    });

    it('should throw for invalid task types', () => {
      expect(() => assertValidTaskType('invalid')).toThrow();
      expect(() => assertValidTaskType('')).toThrow();
    });

    it('should include allowed types in error message', () => {
      try {
        assertValidTaskType('workout_count');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('workout_count');
        expect(error.message).toContain('meal_log');
        expect(error.message).toContain('protein_target');
      }
    });
  });

  describe('ALLOWED_TASK_TYPES constant', () => {
    it('should contain exactly 7 task types', () => {
      expect(ALLOWED_TASK_TYPES).toHaveLength(7);
    });

    it('should contain all expected nutrition/habit types', () => {
      const expectedTypes = [
        'meal_log',
        'protein_target',
        'calorie_window',
        'weigh_in',
        'streak_days',
        'habit_check',
        'edu_read'
      ];

      expectedTypes.forEach(type => {
        expect(ALLOWED_TASK_TYPES).toContain(type);
      });
    });

    it('should not contain any workout types', () => {
      const workoutTypes = [
        'workout_count',
        'lift_target',
        'exercise_complete',
        'cardio_minutes',
        'training_volume',
        'strength_target'
      ];

      workoutTypes.forEach(type => {
        expect(ALLOWED_TASK_TYPES).not.toContain(type);
      });
    });

    it('should be readonly/immutable', () => {
      // TypeScript should prevent mutations, but we can test runtime behavior
      const originalLength = ALLOWED_TASK_TYPES.length;

      // Attempt to modify (should fail or have no effect due to readonly)
      try {
        (ALLOWED_TASK_TYPES as any).push('invalid');
      } catch (e) {
        // Expected to throw in strict mode
      }

      // Array should still have original length
      expect(ALLOWED_TASK_TYPES.length).toBe(originalLength);
    });
  });

  describe('Integration scenarios', () => {
    it('should validate journey config task types', () => {
      const journeyTasks = [
        { type: 'meal_log', key: 't_meal2' },
        { type: 'protein_target', key: 't_protein_80' },
        { type: 'calorie_window', key: 't_calorie_loose' },
        { type: 'weigh_in', key: 't_weigh_1' },
        { type: 'streak_days', key: 't_meal_streak_3' },
        { type: 'habit_check', key: 't_habit_prep' },
        { type: 'edu_read', key: 't_edu_basics' }
      ];

      journeyTasks.forEach(task => {
        expect(validateTaskType(task.type)).toBe(true);
      });
    });

    it('should reject invalid journey config tasks', () => {
      const invalidTasks = [
        { type: 'workout_count', key: 't_workout_3x' },
        { type: 'lift_target', key: 't_squat_100kg' },
        { type: 'exercise_complete', key: 't_bench_press' }
      ];

      invalidTasks.forEach(task => {
        expect(validateTaskType(task.type)).toBe(false);
      });
    });

    it('should filter invalid tasks from a mixed array', () => {
      const mixedTasks = [
        { type: 'meal_log' },
        { type: 'workout_count' },
        { type: 'protein_target' },
        { type: 'lift_target' },
        { type: 'habit_check' }
      ];

      const validTasks = mixedTasks.filter(t => validateTaskType(t.type));

      expect(validTasks).toHaveLength(3);
      expect(validTasks[0].type).toBe('meal_log');
      expect(validTasks[1].type).toBe('protein_target');
      expect(validTasks[2].type).toBe('habit_check');
    });
  });

  describe('Performance', () => {
    it('should validate 1000 task types quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        validateTaskType('meal_log');
        validateTaskType('workout_count');
        validateTaskType('invalid');
      }

      const duration = Date.now() - startTime;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Task Type Documentation', () => {
  it('should document all allowed types', () => {
    // This test serves as documentation for allowed types
    const documentation = {
      meal_log: 'Track number of meals logged',
      protein_target: 'Hit protein target in grams',
      calorie_window: 'Stay within calorie range',
      weigh_in: 'Complete weigh-in(s)',
      streak_days: 'Maintain streak of specific behavior',
      habit_check: 'Manual habit completion',
      edu_read: 'Read educational content'
    };

    Object.keys(documentation).forEach(type => {
      expect(ALLOWED_TASK_TYPES).toContain(type);
    });
  });

  it('should document why workout tasks are not allowed', () => {
    // Documentation test explaining the design decision
    const reason = 'Journey system focuses on nutrition and habit formation only. ' +
                   'Workout tracking is handled by separate training system.';

    expect(reason).toContain('nutrition');
    expect(reason).toContain('habit');
    expect(reason).not.toContain('workout');
  });
});
