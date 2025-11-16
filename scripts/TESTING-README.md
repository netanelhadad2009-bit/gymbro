# Automated Registration Testing Suite

This testing suite automates the process of registering 50 users with varied profiles and validates all aspects of the registration and plan creation flow.

## 📁 Files

- **`test-data-generator.ts`** - Generates 50 varied user profiles
- **`test-validation.ts`** - Validates database entries and plan quality
- **`automated-registration-test.ts`** - Main test orchestrator
- **`test-results-report.ts`** - Formats test results into readable reports
- **`cleanup-test-users.ts`** - Cleans up test users from database
- **`run-registration-tests.sh`** - Bash script to run complete test suite

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have:
- Node.js installed
- Environment variables set (`.env.local` or `.env`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY` (for cleanup)
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_WEB_URL`

### 2. Quick Test (5 Users)

```bash
./scripts/run-registration-tests.sh --count 5
```

### 3. Full Test (50 Users)

```bash
./scripts/run-registration-tests.sh --count 50 --mode all
```

## 📖 Usage Guide

### Running Tests

#### Test Only
```bash
# Test 50 users
./scripts/run-registration-tests.sh

# Test specific number of users
./scripts/run-registration-tests.sh --count 10
```

#### Test with Cleanup
```bash
# Clean before testing
./scripts/run-registration-tests.sh --count 50 --cleanup-before

# Clean after testing
./scripts/run-registration-tests.sh --count 50 --cleanup-after

# Clean before and after
./scripts/run-registration-tests.sh --count 50 --cleanup-before --cleanup-after
```

#### Test and Report
```bash
# Run tests and automatically generate report
./scripts/run-registration-tests.sh --mode all --count 50
```

### Cleanup

#### Dry Run (Preview)
```bash
# See what would be deleted without actually deleting
./scripts/run-registration-tests.sh --mode cleanup --dry-run
```

#### Actual Cleanup
```bash
# Delete all test users
./scripts/run-registration-tests.sh --mode cleanup
```

#### Cleanup by Pattern
```bash
# Clean up specific users
npx ts-node scripts/cleanup-test-users.ts --pattern=@gymbro-test.com
```

### Generate Report

```bash
# Generate report from latest test results
./scripts/run-registration-tests.sh --mode report

# Or manually specify results file
npx ts-node scripts/test-results-report.ts scripts/test-results-1234567890.json
```

## 📊 What Gets Tested

### 1. Registration Flow
- ✅ Nutrition plan generation (90s timeout)
- ✅ User signup via Supabase Auth
- ✅ Avatar bootstrap and persona mapping
- ✅ Nutrition plan attachment to profile
- ✅ Journey stages creation

### 2. Database Validation
- ✅ `auth.users` record exists
- ✅ `profiles` table has user data
- ✅ `avatars` table has correct persona
- ✅ Nutrition plan structure is valid
- ✅ Nutrition status is 'ready'
- ✅ Avatar matches user profile
- ✅ Journey stages exist
- ✅ Calories are within ±200 of target

### 3. Data Quality
- ✅ Nutrition plans have 5 meals minimum
- ✅ Macros are reasonable
- ✅ Avatar persona matches onboarding selections
- ✅ No duplicate records
- ✅ All foreign keys valid

## 📈 Test Data Variety

The generator creates 50 users with varied profiles:

### Demographics
- **Gender**: 50/50 split (male/female)
- **Age**: 18-65 years (varied distribution)
- **Height**: 150-200cm
- **Weight**: 45-150kg
- **Edge Cases**: Extreme heights/weights, large weight changes

### Goals
- **Loss**: 40% (20 users)
- **Gain**: 30% (15 users)
- **Recomp**: 20% (10 users)
- **Maintain**: 10% (5 users)

### Experience
- **Never**: 20%
- **Time**: 20%
- **Sure**: 20%
- **Results**: 20%
- **Knowledge**: 20%

### Training Frequency
- **Low**: 30%
- **Medium**: 40%
- **High**: 30%

### Diet
- **Balanced**: 50%
- **Vegetarian**: 20%
- **Vegan**: 16%
- **Keto**: 10%
- **Paleo**: 4%

## 📊 Sample Report Output

```
🏆 OVERALL RESULTS
──────────────────────────────────────────────────
Test Timestamp: 2025-11-11 10:30:45
Total Users Tested: 50
Successful Registrations: 48/50 (96%)
Total Test Duration: 12m 15s
Average Time Per User: 14.7s

📈 STEP SUCCESS RATES
──────────────────────────────────────────────────
✅ Nutrition Generation: 50/50 (100%)
✅ Registration: 48/50 (96%)
✅ Avatar Bootstrap: 48/48 (100%)
✅ Session Attach: 48/48 (100%)
✅ Stages Bootstrap: 47/48 (98%)

⏱️  AVERAGE STEP DURATIONS
──────────────────────────────────────────────────
  Nutrition Generation: 12.3s
  Registration: 2.1s
  Avatar Bootstrap: 1.2s
  Session Attach: 0.8s
  Stages Bootstrap: 0.5s
  Total: 14.7s

✔️  VALIDATION CHECKS
──────────────────────────────────────────────────
✅ Auth User Exists: 48/50 (96%)
✅ Profile Exists: 48/50 (96%)
✅ Avatar Exists: 47/50 (94%)
✅ Nutrition Plan Exists: 48/50 (96%)
✅ Nutrition Status Ready: 48/50 (96%)
⚠️ Avatar Matches: 46/50 (92%)
⚠️ Stages Exist: 45/50 (90%)
✅ Nutrition Quality: 48/50 (96%)
✅ Calories In Range: 46/50 (92%)
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Environment Variables Not Set
```bash
# Check if variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Load from .env.local
export $(cat .env.local | grep -v '^#' | xargs)
```

#### 2. Timeout Errors
If nutrition generation times out frequently:
- Check API server is running
- Verify Anthropic API key is valid
- Check network connection
- Increase timeout in `automated-registration-test.ts`

#### 3. Database Errors
If validation fails:
- Check database migrations are applied
- Verify tables exist: `profiles`, `avatars`, `programs`, `journey_stages`
- Check foreign key constraints

#### 4. Permission Errors
If cleanup fails:
- Verify `SUPABASE_SERVICE_KEY` is set (not `ANON_KEY`)
- Check service role has admin permissions

### Debug Mode

Run individual scripts with error logging:

```bash
# Test data generator
npx ts-node scripts/test-data-generator.ts

# Single user test
npx ts-node scripts/automated-registration-test.ts 1

# Validation only
npx ts-node scripts/test-validation.ts
```

## 📁 Test Results Files

Test results are saved with timestamps:
- `test-results-{timestamp}.json` - Full results
- `test-results-{timestamp}-summary.json` - Summary statistics

Keep these files for:
- Historical comparison
- Debugging failed users
- Performance tracking

## 🧹 Cleanup Best Practices

1. **Always dry-run first**
   ```bash
   ./scripts/run-registration-tests.sh --mode cleanup --dry-run
   ```

2. **Backup before bulk cleanup**
   - Export test user data if needed
   - Verify correct users are targeted

3. **Clean up after testing**
   ```bash
   ./scripts/run-registration-tests.sh --count 5 --cleanup-before --cleanup-after
   ```

## 🚦 Continuous Testing

### Daily Tests
```bash
# Run 10 user test daily
./scripts/run-registration-tests.sh --count 10 --cleanup-after > daily-test.log
```

### Pre-Deployment
```bash
# Full 50 user test before deployment
./scripts/run-registration-tests.sh --mode all --count 50 --cleanup-after
```

### CI/CD Integration
```bash
# Add to CI pipeline
- name: Registration Test
  run: |
    chmod +x scripts/run-registration-tests.sh
    ./scripts/run-registration-tests.sh --count 10 --cleanup-after
```

## 📚 Additional Resources

- **Architecture**: See project documentation for registration flow
- **API Docs**: Check `/services/api/src/routes/` for API endpoints
- **Database Schema**: See `/supabase/migrations/` for table structures

## 🤝 Contributing

When adding new validation checks:
1. Update `test-validation.ts`
2. Add to `ValidationResult` interface
3. Update report generator to display new checks
4. Document in this README

## 📞 Support

If you encounter issues:
1. Check troubleshooting section
2. Review test results JSON for details
3. Check individual script logs
4. Verify environment setup

---

**Last Updated**: 2025-11-11
**Version**: 1.0.0
