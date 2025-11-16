/**
 * Tests for Journey Builder - Persona-driven journey generation
 */

import { buildJourneyFromPersona, derivePersonaFromMetadata, type Persona } from './builder';

describe('buildJourneyFromPersona', () => {
  it('should include basic nodes for all personas', () => {
    const persona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { chapters, nodes } = buildJourneyFromPersona(persona);

    // Should always have basics chapter
    expect(chapters.length).toBeGreaterThanOrEqual(1);
    expect(chapters[0].id).toBe('basics');

    // Should always include weigh-in
    const weighIn = nodes.find(n => n.id === 'weigh_in_today');
    expect(weighIn).toBeDefined();
    expect(weighIn?.type).toBe('FIRST_WEIGH_IN');

    // Should always include log meals
    const logMeals = nodes.find(n => n.id === 'log_2_meals');
    expect(logMeals).toBeDefined();
    expect(logMeals?.type).toBe('LOG_MEALS_TODAY');

    // Should always include protein target
    const protein = nodes.find(n => n.id === 'protein_min');
    expect(protein).toBeDefined();
    expect(protein?.type).toBe('HIT_PROTEIN_GOAL');
  });

  it('should set gender-specific protein targets', () => {
    const malePersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const femalePersona: Persona = {
      gender: 'female',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const malePlan = buildJourneyFromPersona(malePersona);
    const femalePlan = buildJourneyFromPersona(femalePersona);

    const maleProtein = malePlan.nodes.find(n => n.id === 'protein_min');
    const femaleProtein = femalePlan.nodes.find(n => n.id === 'protein_min');

    // Male should have 120g target
    expect(maleProtein?.metadata?.threshold).toBe(120);

    // Female should have 90g target
    expect(femaleProtein?.metadata?.threshold).toBe(90);
  });

  it('should include vegan protein node for vegan diet', () => {
    const veganPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'vegan',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(veganPersona);

    const veganProtein = nodes.find(n => n.id === 'vegan_protein_sources');
    expect(veganProtein).toBeDefined();
    expect(veganProtein?.type).toBe('VEGAN_PROTEIN');
  });

  it('should NOT include vegan protein for non-vegan diets', () => {
    const regularPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(regularPersona);

    const veganProtein = nodes.find(n => n.id === 'vegan_protein_sources');
    expect(veganProtein).toBeUndefined();
  });

  it('should include keto node for keto diet', () => {
    const ketoPersona: Persona = {
      gender: 'male',
      goal: 'cut',
      diet: 'keto',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(ketoPersona);

    const ketoDay = nodes.find(n => n.id === 'keto_day');
    expect(ketoDay).toBeDefined();
    expect(ketoDay?.type).toBe('KETO_COMPLIANT');
    expect(ketoDay?.metadata?.threshold).toBe(30);
    expect(ketoDay?.metadata?.nutrient).toBe('carbs');
    expect(ketoDay?.metadata?.operator).toBe('lte');
  });

  it('should NOT include keto node for non-keto diets', () => {
    const veganPersona: Persona = {
      gender: 'male',
      goal: 'cut',
      diet: 'vegan',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(veganPersona);

    const ketoDay = nodes.find(n => n.id === 'keto_day');
    expect(ketoDay).toBeUndefined();
  });

  it('should include calorie deficit for cut goal', () => {
    const cutPersona: Persona = {
      gender: 'male',
      goal: 'cut',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(cutPersona);

    const deficit = nodes.find(n => n.id === 'cal_deficit_day');
    expect(deficit).toBeDefined();
    expect(deficit?.type).toBe('CALORIE_DEFICIT');
  });

  it('should include calorie surplus for bulk goal', () => {
    const bulkPersona: Persona = {
      gender: 'male',
      goal: 'bulk',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(bulkPersona);

    const surplus = nodes.find(n => n.id === 'cal_surplus_day');
    expect(surplus).toBeDefined();
    expect(surplus?.type).toBe('CALORIE_SURPLUS');
  });

  it('should NOT include calorie nodes for recomp goal', () => {
    const recompPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(recompPersona);

    const deficit = nodes.find(n => n.id === 'cal_deficit_day');
    const surplus = nodes.find(n => n.id === 'cal_surplus_day');

    expect(deficit).toBeUndefined();
    expect(surplus).toBeUndefined();
  });

  it('should include workout frequency for high frequency users', () => {
    const highFreqPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'high',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(highFreqPersona);

    const workout = nodes.find(n => n.id === 'workout_3x_week');
    expect(workout).toBeDefined();
    expect(workout?.type).toBe('WORKOUT_FREQUENCY');
  });

  it('should include workout frequency for intermediate+ users', () => {
    const intermediatePersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'intermediate',
    };

    const { nodes } = buildJourneyFromPersona(intermediatePersona);

    const workout = nodes.find(n => n.id === 'workout_3x_week');
    expect(workout).toBeDefined();
  });

  it('should NOT include workout frequency for low-freq beginners', () => {
    const beginnerPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'low',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(beginnerPersona);

    const workout = nodes.find(n => n.id === 'workout_3x_week');
    expect(workout).toBeUndefined();
  });

  it('should include week streak for advanced users', () => {
    const advancedPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'medium',
      experience: 'advanced',
    };

    const { nodes } = buildJourneyFromPersona(advancedPersona);

    const streak = nodes.find(n => n.id === 'week_streak_7');
    expect(streak).toBeDefined();
    expect(streak?.type).toBe('WEEK_STREAK_7');
  });

  it('should group nodes into chapters correctly', () => {
    const persona: Persona = {
      gender: 'male',
      goal: 'bulk',
      diet: 'vegan',
      frequency: 'high',
      experience: 'intermediate',
    };

    const { chapters } = buildJourneyFromPersona(persona);

    // Should have at least basics and advanced
    expect(chapters.length).toBeGreaterThanOrEqual(2);

    const basics = chapters.find(c => c.id === 'basics');
    const advanced = chapters.find(c => c.id === 'advanced');

    expect(basics).toBeDefined();
    expect(advanced).toBeDefined();

    // Basics should come first
    expect(basics?.order).toBeLessThan(advanced?.order || 999);

    // Each chapter should have nodes
    expect(basics?.nodes.length).toBeGreaterThan(0);
    expect(advanced?.nodes.length).toBeGreaterThan(0);
  });

  it('should assign increasing order numbers to nodes', () => {
    const persona: Persona = {
      gender: 'male',
      goal: 'cut',
      diet: 'keto',
      frequency: 'high',
      experience: 'advanced',
    };

    const { nodes } = buildJourneyFromPersona(persona);

    // All nodes should have order property
    nodes.forEach(node => {
      expect(node.order).toBeDefined();
      expect(typeof node.order).toBe('number');
    });

    // Orders should be sequential (no duplicates)
    const orders = nodes.map(n => n.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });

  it('should return at least 4 nodes for any persona', () => {
    const minimalPersona: Persona = {
      gender: 'male',
      goal: 'recomp',
      diet: 'none',
      frequency: 'low',
      experience: 'beginner',
    };

    const { nodes } = buildJourneyFromPersona(minimalPersona);

    // Always 3 basics + at least 1 more based on persona
    expect(nodes.length).toBeGreaterThanOrEqual(4);
  });
});

describe('derivePersonaFromMetadata', () => {
  it('should use metadata values when available', () => {
    const metadata = {
      gender: 'female',
      goals: ['bulk'],
      diet: 'vegan',
      training_frequency_actual: 'high',
      experience: 'intermediate',
    };

    const persona = derivePersonaFromMetadata(metadata);

    expect(persona.gender).toBe('female');
    expect(persona.goal).toBe('bulk');
    expect(persona.diet).toBe('vegan');
    expect(persona.frequency).toBe('high');
    expect(persona.experience).toBe('intermediate');
  });

  it('should use defaults when metadata is empty', () => {
    const persona = derivePersonaFromMetadata({});

    expect(persona.gender).toBe('male');
    expect(persona.goal).toBe('recomp');
    expect(persona.diet).toBe('none');
    expect(persona.frequency).toBe('medium');
    expect(persona.experience).toBe('beginner');
  });

  it('should use defaults when metadata is undefined', () => {
    const persona = derivePersonaFromMetadata(undefined);

    expect(persona.gender).toBe('male');
    expect(persona.goal).toBe('recomp');
    expect(persona.diet).toBe('none');
    expect(persona.frequency).toBe('medium');
    expect(persona.experience).toBe('beginner');
  });

  it('should handle single goal string instead of array', () => {
    const metadata = {
      goal: 'cut',
    };

    const persona = derivePersonaFromMetadata(metadata);

    expect(persona.goal).toBe('cut');
  });
});
