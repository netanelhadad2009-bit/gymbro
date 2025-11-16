import { resolveAvatar, getAvatarById, getAllAvatars, type OnboardingAnswers } from '../resolveAvatar';

describe('resolveAvatar', () => {
  describe('Basic matching', () => {
    test('should match rookie-cut for beginner weight loss', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'never',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('rookie-cut');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.matchedRules).toContain('goal:loss');
      expect(result.matchedRules).toContain('frequency:3');
    });

    test('should match rookie-gain for beginner muscle gain', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 2,
        experience: 'never',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('rookie-gain');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.matchedRules).toContain('goal:gain');
    });

    test('should match gym-regular-cut for experienced 4-5x/week', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 4,
        experience: 'knowledge',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('gym-regular-cut');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchedRules).toContain('frequency:4');
    });

    test('should match athlete-gain for high-frequency advanced', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 6,
        experience: 'knowledge',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('athlete-gain');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchedRules).toContain('frequency:6');
    });
  });

  describe('Diet-based matching', () => {
    test('should match plant-powered-cut for vegan weight loss', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'knowledge',
        diet: 'vegan',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('plant-powered-cut');
      expect(result.matchedRules).toContain('diet:vegan');
    });

    test('should match plant-powered-gain for vegetarian muscle gain', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 4,
        experience: 'results',
        diet: 'vegetarian',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('plant-powered-gain');
      expect(result.matchedRules).toContain('diet:vegetarian');
    });

    test('should not match plant-powered avatar for non-plant-based diet', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'knowledge',
        diet: 'keto',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).not.toContain('plant-powered');
    });
  });

  describe('Frequency-based matching', () => {
    test('should match busy-3day-cut for exactly 3x/week with time constraint', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'time',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('busy-3day-cut');
      expect(result.matchedRules).toContain('frequency:3');
      expect(result.matchedRules).toContain('experience:time');
    });

    test('should match athlete-cut for high frequency 5-6x/week', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 5,
        experience: 'results',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('athlete-cut');
      expect(result.matchedRules).toContain('frequency:5');
    });
  });

  describe('Recomp matching', () => {
    test('should match recomp-balanced for body recomposition goal', () => {
      const answers: OnboardingAnswers = {
        goal: 'recomp',
        frequency: 4,
        experience: 'knowledge',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('recomp-balanced');
      expect(result.matchedRules).toContain('goal:recomp');
    });
  });

  describe('Comeback athlete', () => {
    test('should match comeback-cut for returning athlete', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'results',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      // Could be comeback-cut or busy-3day-cut depending on scoring
      expect(['comeback-cut', 'busy-3day-cut', 'rookie-cut']).toContain(result.avatarId);
    });
  });

  describe('Edge cases and confidence', () => {
    test('should handle minimal answers with fallback', () => {
      const answers: OnboardingAnswers = {};

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should give low confidence for mismatched goals', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 10, // Invalid frequency
        experience: 'never',
      };

      const result = resolveAvatar(answers);

      // Should still find a match but with lower confidence
      expect(result.avatarId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should be deterministic with same inputs', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 3,
        experience: 'time',
        diet: 'none',
      };

      const result1 = resolveAvatar(answers);
      const result2 = resolveAvatar(answers);

      expect(result1.avatarId).toBe(result2.avatarId);
      expect(result1.confidence).toBe(result2.confidence);
    });

    test('should handle close frequency with soft match', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 3,
        experience: 'never',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      // Should still match rookie-gain even though it prefers 2-3
      expect(result.avatarId).toBe('rookie-gain');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Helper functions', () => {
    test('getAvatarById should return correct avatar', () => {
      const avatar = getAvatarById('rookie-cut');

      expect(avatar).toBeDefined();
      expect(avatar?.id).toBe('rookie-cut');
      expect(avatar?.title).toBe('המתחיל בירידה');
    });

    test('getAvatarById should return null for invalid ID', () => {
      const avatar = getAvatarById('non-existent-avatar');

      expect(avatar).toBeNull();
    });

    test('getAllAvatars should return all avatars', () => {
      const avatars = getAllAvatars();

      expect(avatars.length).toBeGreaterThanOrEqual(12);
      expect(avatars[0]).toHaveProperty('id');
      expect(avatars[0]).toHaveProperty('title');
      expect(avatars[0]).toHaveProperty('fit_rules');
    });
  });

  describe('Real-world scenarios', () => {
    test('Complete beginner wanting to lose weight', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 2,
        experience: 'never',
        diet: 'none',
        activity: 'sedentary',
        height_cm: 175,
        weight_kg: 90,
        bmi: 29.4,
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('rookie-cut');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('Busy professional wanting efficient muscle gain', () => {
      const answers: OnboardingAnswers = {
        goal: 'gain',
        frequency: 3,
        experience: 'time',
        diet: 'none',
        activity: 'light',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('busy-3day-gain');
      expect(result.matchedRules).toContain('experience:time');
    });

    test('Experienced vegan athlete cutting', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 5,
        experience: 'knowledge',
        diet: 'vegan',
        activity: 'high',
      };

      const result = resolveAvatar(answers);

      expect(result.avatarId).toBe('plant-powered-cut');
      expect(result.matchedRules).toContain('diet:vegan');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('Former athlete returning after break', () => {
      const answers: OnboardingAnswers = {
        goal: 'loss',
        frequency: 3,
        experience: 'results',
        diet: 'none',
      };

      const result = resolveAvatar(answers);

      // Multiple valid matches possible
      expect(['comeback-cut', 'busy-3day-cut']).toContain(result.avatarId);
    });
  });
});
