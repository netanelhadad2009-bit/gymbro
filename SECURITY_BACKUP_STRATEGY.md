# Security Backup & Recovery Strategy

## Overview

This document outlines the backup and disaster recovery strategy for the gymbro/fitjourney application. It covers database backups, recovery procedures, and business continuity planning.

**Last Updated**: 2025-11-18
**Status**: Production Ready

---

## Table of Contents

1. [Backup Architecture](#backup-architecture)
2. [Supabase Database Backups](#supabase-database-backups)
3. [Recovery Procedures](#recovery-procedures)
4. [Testing Backups](#testing-backups)
5. [Incident Scenarios](#incident-scenarios)
6. [Business Continuity](#business-continuity)
7. [Backup Checklist](#backup-checklist)

---

## Backup Architecture

### What Needs Backup?

#### 1. **Supabase PostgreSQL Database** (CRITICAL)
- User profiles and authentication data
- User-generated content (meals, workouts, progress)
- Points, badges, gamification data
- Journey progress and completions
- AI coach conversations
- Push notification subscriptions

**Backup Frequency**: Daily (automated by Supabase)
**Retention**: 7 days (Free tier), 30+ days (Pro tier recommended)

#### 2. **Application Code** (Version Controlled)
- All code stored in Git repository
- Deployed via Vercel (immutable deployments)

**Backup Frequency**: Continuous (Git + Vercel)
**Retention**: Indefinite (Git history)

#### 3. **Environment Variables** (Manual)
- Stored in Vercel dashboard and local `.env.local`
- Documented in `SECURITY_SECRETS_RUNBOOK.md`

**Backup Frequency**: After any change (manual documentation)
**Retention**: Indefinite (documented in runbook)

#### 4. **Uploaded Files** (If applicable)
- Currently: None (no user file uploads)
- Future: Avatar images would need Supabase Storage backup

---

## Supabase Database Backups

### Automatic Daily Backups

Supabase provides automatic daily backups for all projects.

#### Free Tier
- **Frequency**: Daily
- **Retention**: 7 days (rolling)
- **Location**: Supabase-managed AWS infrastructure
- **Access**: Via Supabase Dashboard

#### Pro Tier (Recommended for Production)
- **Frequency**: Daily
- **Retention**: 30 days
- **Location**: Same region as primary database
- **Point-in-Time Recovery (PITR)**: Available
- **Access**: Via Supabase Dashboard or CLI

### Accessing Backups

**Via Supabase Dashboard**:
1. Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Database** → **Backups**
4. View available backups with timestamps
5. Click **Restore** to restore a backup

**Via Supabase CLI** (Pro tier):
```bash
# List backups
supabase db backups list

# Restore specific backup
supabase db backups restore <backup-id>
```

### Manual Database Exports

For additional safety, create manual exports:

#### Full Database Dump (SQL)
```bash
# Export entire database schema + data
# Replace with your actual Supabase connection string
pg_dump "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="backup-$(date +%Y%m%d-%H%M%S).sql"
```

**Recommended Schedule**: Weekly manual exports
**Storage**: Encrypted cloud storage (Google Drive, Dropbox, S3)

#### Specific Table Backup (CSV)
```bash
# Export specific table to CSV (via Supabase SQL Editor)
COPY (SELECT * FROM meals) TO STDOUT WITH CSV HEADER;

# Or via psql
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres" \
  -c "COPY meals TO STDOUT WITH CSV HEADER" > meals-backup.csv
```

### Migration Files

All database migrations are version-controlled in:
- `supabase/migrations/*.sql`

These can recreate the schema from scratch if needed.

---

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

**If a single user deleted their data accidentally:**

1. **Check audit logs** (if enabled):
   ```sql
   -- Check recent deletions
   SELECT * FROM audit_log
   WHERE table_name = 'meals'
     AND operation = 'DELETE'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Restore from backup**:
   - Go to Supabase Dashboard → Database → Backups
   - Find backup before deletion
   - Restore to a temporary project
   - Export affected user's data
   - Import back to production

3. **Notify user** of recovery completion

**Time to Recovery**: 30-60 minutes

### Scenario 2: Complete Database Corruption

**If the entire database becomes corrupted or inaccessible:**

1. **Create new Supabase project** (fresh instance)

2. **Restore from latest backup**:
   - Supabase Dashboard → Backups → Restore
   - Select most recent clean backup
   - Restore to new project

3. **Update environment variables**:
   ```bash
   # Update .env.local and Vercel env vars
   NEXT_PUBLIC_SUPABASE_URL="https://[new-project].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="[new-anon-key]"
   SUPABASE_SERVICE_ROLE_KEY="[new-service-role-key]"
   ```

4. **Run migrations** (if needed):
   ```bash
   cd supabase
   supabase db push
   ```

5. **Deploy application** with new env vars:
   ```bash
   vercel --prod
   ```

6. **Verify data integrity**:
   - Run security test scripts
   - Check sample user accounts
   - Verify RLS policies

**Time to Recovery**: 2-4 hours

### Scenario 3: Accidental Migration Rollback

**If a bad migration was deployed:**

1. **Identify problematic migration**:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 10;
   ```

2. **Create rollback migration**:
   ```bash
   # Create new migration that reverts changes
   supabase migration new rollback_bad_migration
   ```

3. **Write reverse migration**:
   ```sql
   -- Example: Undo table creation
   DROP TABLE IF EXISTS bad_table CASCADE;

   -- Example: Restore dropped column
   ALTER TABLE users ADD COLUMN restored_column TEXT;
   ```

4. **Test in staging** first

5. **Deploy to production**:
   ```bash
   supabase db push
   ```

**Time to Recovery**: 30-60 minutes

### Scenario 4: Supabase Service Outage

**If Supabase itself is down:**

1. **Check Supabase Status Page**:
   - [https://status.supabase.com](https://status.supabase.com)

2. **Wait for service restoration** (Supabase SLA):
   - Free tier: No SLA
   - Pro tier: 99.9% uptime (~43 minutes/month downtime)

3. **If extended outage (>4 hours)**:
   - Consider migrating to self-hosted PostgreSQL
   - Use manual SQL dump to restore data
   - Update connection strings

**Time to Recovery**: Dependent on Supabase (typically <1 hour)

---

## Testing Backups

### Monthly Backup Testing Procedure

**Purpose**: Verify backups are valid and can be restored

**Frequency**: Monthly

**Steps**:

1. **Create test Supabase project**:
   - Name it `gymbro-backup-test-[date]`

2. **Restore latest backup**:
   - Supabase Dashboard → Backups → Restore to test project

3. **Verify data integrity**:
   ```sql
   -- Check row counts
   SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
   UNION ALL
   SELECT 'meals', COUNT(*) FROM meals
   UNION ALL
   SELECT 'user_points', COUNT(*) FROM user_points;

   -- Check latest data timestamp
   SELECT MAX(created_at) FROM meals;
   SELECT MAX(created_at) FROM user_progress;
   ```

4. **Test sample queries**:
   ```sql
   -- Can we read user data?
   SELECT * FROM profiles LIMIT 5;

   -- Are RLS policies intact?
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

5. **Document results**:
   - Date of test
   - Backup used (timestamp)
   - Data integrity results
   - Any issues found

6. **Delete test project** after verification

**Expected Duration**: 30 minutes

---

## Incident Scenarios

### Data Loss Impact Assessment

| Scenario | Impact | Recovery Time | Data Loss |
|----------|--------|---------------|-----------|
| Single user data deleted | Low | 30-60 min | <24 hours |
| Single table corrupted | Medium | 1-2 hours | <24 hours |
| Entire database corrupted | High | 2-4 hours | <24 hours |
| Supabase region outage | High | 1-8 hours | None (if recovered) |
| Malicious data deletion | Critical | 2-6 hours | Variable |

### Prevention Measures

1. **RLS Policies**: Prevent accidental cross-user data access
2. **FORCE RLS**: Even privileged roles respect RLS
3. **Rate Limiting**: Prevent bulk deletion attacks
4. **Audit Logging** (Future): Track all data modifications
5. **Read Replicas** (Pro tier): Additional data redundancy

---

## Business Continuity

### Disaster Recovery Plan

#### Recovery Time Objective (RTO)
**Target**: 4 hours maximum downtime

- **Tier 1 (Critical)**: Database restoration - 2 hours
- **Tier 2 (High)**: Application deployment - 1 hour
- **Tier 3 (Medium)**: Verification & testing - 1 hour

#### Recovery Point Objective (RPO)
**Target**: 24 hours maximum data loss

- Daily backups ensure max 24h data loss
- Upgrade to Pro tier with PITR for near-zero RPO

### Stakeholder Communication

**In case of major incident**:

1. **Status Page**: Update [status.yourdomain.com] (if available)
2. **User Notification**: Email/push notification to affected users
3. **Team Notification**: Slack/Discord emergency channel
4. **Regular Updates**: Every 30 minutes during recovery

### Post-Incident Review

After any recovery event, document:

1. **Incident Timeline**:
   - When was issue discovered?
   - What caused it?
   - What was the impact?

2. **Response Actions**:
   - What recovery steps were taken?
   - What worked well?
   - What could be improved?

3. **Preventive Measures**:
   - What changes will prevent recurrence?
   - Update documentation
   - Update runbooks

4. **Store in**: `docs/incidents/YYYY-MM-DD-description.md`

---

## Backup Checklist

### Daily (Automated)
- [x] Supabase automatic daily backup
- [ ] Verify backup completed (check Supabase dashboard)

### Weekly (Manual)
- [ ] Export critical tables to CSV
- [ ] Store encrypted backups in cloud storage
- [ ] Verify backup file integrity
- [ ] Document any schema changes

### Monthly (Manual)
- [ ] Test backup restoration procedure
- [ ] Review and update this document
- [ ] Verify environment variable documentation
- [ ] Check Supabase backup retention settings
- [ ] Review disaster recovery plan

### Quarterly (Strategic)
- [ ] Review and update RTO/RPO targets
- [ ] Audit backup security (encryption, access)
- [ ] Consider upgrading Supabase tier if needed
- [ ] Disaster recovery drill (full restoration test)

---

## Supabase Pro Tier Benefits (Recommended for Production)

| Feature | Free Tier | Pro Tier ($25/mo) |
|---------|-----------|-------------------|
| Backup Retention | 7 days | 30 days |
| Point-in-Time Recovery | ❌ | ✅ |
| Database Size | 500 MB | 8 GB |
| Daily Backups | ✅ | ✅ |
| Read Replicas | ❌ | ✅ (Add-on) |
| Support | Community | Email Support |
| Uptime SLA | None | 99.9% |

**Recommendation**: Upgrade to Pro tier before launching to production users.

---

## Additional Resources

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Disaster Recovery Planning](https://www.ready.gov/business/implementation/IT)

---

## Related Documents

- [SECURITY_SECRETS_RUNBOOK.md](./SECURITY_SECRETS_RUNBOOK.md) - Secret rotation procedures
- [SECURITY_MONITORING.md](./SECURITY_MONITORING.md) - Security monitoring strategy
- [SECURITY_FINAL_AUDIT.md](./SECURITY_FINAL_AUDIT.md) - Complete security audit
