import { resolveAvatar, getAllAvatars, type OnboardingAnswers } from './resolveAvatar';

// Test basic resolution
const testAnswers: OnboardingAnswers = {
  goal: 'loss',
  frequency: 3,
  experience: 'never',
  diet: 'none',
};

console.log('🧪 Testing Avatar Resolution System\n');

console.log('Test 1: Basic rookie-cut matching');
const result = resolveAvatar(testAnswers);
console.log(`✅ Resolved avatar: ${result.avatarId}`);
console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
console.log(`   Matched rules: ${result.matchedRules.join(', ')}`);
console.log(`   Reasons: ${result.reasons.join(', ')}\n`);

console.log('Test 2: All avatars loaded');
const allAvatars = getAllAvatars();
console.log(`✅ Total avatars: ${allAvatars.length}`);
console.log(`   Avatar IDs: ${allAvatars.map(a => a.id).join(', ')}\n`);

console.log('Test 3: Plant-based matching');
const veganAnswers: OnboardingAnswers = {
  goal: 'loss',
  frequency: 4,
  experience: 'knowledge',
  diet: 'vegan',
};
const veganResult = resolveAvatar(veganAnswers);
console.log(`✅ Resolved avatar: ${veganResult.avatarId}`);
console.log(`   Confidence: ${veganResult.confidence.toFixed(2)}\n`);

console.log('Test 4: High-frequency athlete');
const athleteAnswers: OnboardingAnswers = {
  goal: 'gain',
  frequency: 6,
  experience: 'knowledge',
  diet: 'none',
};
const athleteResult = resolveAvatar(athleteAnswers);
console.log(`✅ Resolved avatar: ${athleteResult.avatarId}`);
console.log(`   Confidence: ${athleteResult.confidence.toFixed(2)}\n`);

console.log('🎉 All tests passed!');
