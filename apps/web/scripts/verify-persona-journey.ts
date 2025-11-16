/**
 * Verification Script: Persona-Driven Journey System
 *
 * This script demonstrates how different personas generate different journey nodes.
 * Run with: npx tsx scripts/verify-persona-journey.ts
 */

import { buildJourneyFromPersona, type Persona } from '../lib/journey/builder';

// Test personas from documentation
const testPersonas: Array<{ name: string; persona: Persona }> = [
  {
    name: 'Female + Loss + Vegan + Low + Knowledge',
    persona: {
      gender: 'female',
      goal: 'loss',
      diet: 'vegan',
      frequency: 'low',
      experience: 'knowledge',
    },
  },
  {
    name: 'Male + Cut + Keto + High + Intermediate',
    persona: {
      gender: 'male',
      goal: 'cut',
      diet: 'keto',
      frequency: 'high',
      experience: 'intermediate',
    },
  },
  {
    name: 'Male + Bulk + Balanced + Medium + Beginner',
    persona: {
      gender: 'male',
      goal: 'bulk',
      diet: 'balanced',
      frequency: 'medium',
      experience: 'beginner',
    },
  },
  {
    name: 'Female + Recomp + Paleo + High + Advanced',
    persona: {
      gender: 'female',
      goal: 'recomp',
      diet: 'paleo',
      frequency: 'high',
      experience: 'advanced',
    },
  },
];

console.log('='.repeat(80));
console.log('PERSONA-DRIVEN JOURNEY VERIFICATION');
console.log('='.repeat(80));
console.log();

testPersonas.forEach(({ name, persona }) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`PERSONA: ${name}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Gender: ${persona.gender}`);
  console.log(`Goal: ${persona.goal}`);
  console.log(`Diet: ${persona.diet}`);
  console.log(`Frequency: ${persona.frequency}`);
  console.log(`Experience: ${persona.experience}`);
  console.log();

  const { chapters, nodes } = buildJourneyFromPersona(persona);

  console.log(`JOURNEY PLAN:`);
  console.log(`  Chapters: ${chapters.length}`);
  console.log(`  Total Nodes: ${nodes.length}`);
  console.log(`  Total Points: ${nodes.reduce((sum, n) => sum + n.points, 0)}`);
  console.log();

  chapters.forEach((chapter) => {
    console.log(`  Chapter: ${chapter.name} (${chapter.id})`);
    chapter.nodes.forEach((node) => {
      const thresholdInfo = node.metadata?.threshold
        ? ` [${node.metadata.operator || 'gte'} ${node.metadata.threshold}${node.metadata.nutrient ? ' ' + node.metadata.nutrient : ''}]`
        : '';
      console.log(`    ├─ ${node.id} (${node.type}) - ${node.points}pts${thresholdInfo}`);
    });
    console.log();
  });

  console.log(`NODE IDs: [${nodes.map(n => `'${n.id}'`).join(', ')}]`);
  console.log();
});

console.log('='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Expected Behavior:');
console.log('  ✓ All personas have 3 basic nodes (weigh_in, log_meals, protein)');
console.log('  ✓ Protein target: 120g for male, 90g for female');
console.log('  ✓ Goal-specific: cut → deficit, bulk → surplus');
console.log('  ✓ Diet-specific: vegan → vegan_protein, keto → keto_day');
console.log('  ✓ Frequency-specific: high → workout_3x_week');
console.log('  ✓ Experience-specific: intermediate/advanced → week_streak_7');
console.log();
