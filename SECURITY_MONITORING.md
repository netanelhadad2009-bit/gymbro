# Security Monitoring & Alerting Strategy

## Overview

This document outlines the security monitoring strategy for the gymbro/fitjourney application. It covers what to monitor, how to detect security incidents, and how to respond.

**Last Updated**: 2025-11-18
**Status**: Production Ready

---

## Table of Contents

1. [Monitoring Layers](#monitoring-layers)
2. [Critical Security Events](#critical-security-events)
3. [Log Sanitization](#log-sanitization)
4. [Alerting Rules](#alerting-rules)
5. [Monitoring Tools Setup](#monitoring-tools-setup)
6. [Incident Response](#incident-response)
7. [Metrics & Dashboards](#metrics--dashboards)

---

## Monitoring Layers

Security monitoring is implemented at multiple layers:

### 1. Application Layer (Next.js)
- **What**: API route errors, authentication failures, authorization failures
- **Where**: API routes, middleware, server actions
- **Tool**: Sanitized logging via `lib/logger.ts`

### 2. Database Layer (Supabase)
- **What**: RLS policy violations, unusual query patterns, database errors
- **Where**: Supabase Dashboard → Logs
- **Tool**: Supabase built-in logging

### 3. Platform Layer (Vercel)
- **What**: Function errors, deployment issues, rate limit hits
- **Where**: Vercel Dashboard → Logs, Analytics
- **Tool**: Vercel Analytics & Logs

### 4. External Services
- **What**: OpenAI API errors, rate limits, quota usage
- **Where**: OpenAI Dashboard → Usage
- **Tool**: OpenAI built-in monitoring

---

## Critical Security Events

### 🚨 Severity: CRITICAL (Immediate Response Required)

#### 1. Unauthorized Data Access Attempts
```typescript
// When: User tries to access another user's data
// Detection: RLS policy violation + 403/404 response
// Example log pattern:
{
  level: 'error',
  event: 'unauthorized_access_attempt',
  userId: 'user-123',
  targetResource: 'meal-456',
  endpoint: '/api/meals/456',
  method: 'GET'
}
```

**Alert Threshold**: 5+ attempts in 5 minutes from same user
**Response**: Temporary account suspension, investigate user intent

#### 2. Authentication Bypass Attempts
```typescript
// When: Request without JWT token gets 200 response (should be 401)
// Detection: Successful API call without Authorization header
// Example log pattern:
{
  level: 'critical',
  event: 'auth_bypass_detected',
  endpoint: '/api/meals',
  method: 'GET',
  status: 200,
  hasAuthHeader: false
}
```

**Alert Threshold**: 1+ occurrence
**Response**: Immediate investigation, deploy hotfix if vulnerability confirmed

#### 3. Mass Data Extraction
```typescript
// When: User makes rapid successive API calls to list endpoints
// Detection: >100 requests to list endpoints in 1 minute
// Example log pattern:
{
  level: 'warning',
  event: 'potential_data_scraping',
  userId: 'user-123',
  endpoint: '/api/meals',
  requestCount: 150,
  timeWindow: '60s'
}
```

**Alert Threshold**: 100+ list endpoint calls in 1 minute
**Response**: Temporary rate limit tightening, user notification

#### 4. Privilege Escalation Attempts
```typescript
// When: User attempts to access admin/privileged endpoints
// Detection: Call to non-existent admin routes or service_role operations
// Example log pattern:
{
  level: 'critical',
  event: 'privilege_escalation_attempt',
  userId: 'user-123',
  endpoint: '/api/admin/users',
  userRole: 'authenticated'
}
```

**Alert Threshold**: 1+ occurrence
**Response**: Immediate account investigation, potential suspension

### ⚠️ Severity: HIGH (Response Within 1 Hour)

#### 5. Repeated Authentication Failures
```typescript
// When: Multiple failed login attempts
// Detection: Supabase auth errors for same email
{
  level: 'warning',
  event: 'repeated_auth_failures',
  email: 'user@example.com',
  failureCount: 10,
  timeWindow: '10m'
}
```

**Alert Threshold**: 10+ failures in 10 minutes
**Response**: Temporary account lock, notify user of suspicious activity

#### 6. Rate Limit Violations
```typescript
// When: User hits rate limits repeatedly
// Detection: Multiple 429 responses from same user
{
  level: 'warning',
  event: 'rate_limit_violation',
  userId: 'user-123',
  endpoint: '/api/ai/workout',
  violationCount: 5
}
```

**Alert Threshold**: 5+ rate limit hits in 1 hour
**Response**: Investigate if legitimate user or bot, adjust limits if needed

#### 7. Suspicious AI Usage Patterns
```typescript
// When: Unusual AI API usage (potential abuse)
// Detection: Extremely long prompts, rapid AI calls, injection attempts
{
  level: 'warning',
  event: 'suspicious_ai_usage',
  userId: 'user-123',
  endpoint: '/api/ai/nutrition',
  promptLength: 5000,
  containsSQLKeywords: true
}
```

**Alert Threshold**: 3+ suspicious patterns in 10 minutes
**Response**: Review prompts for abuse, implement stricter input validation

### 📊 Severity: MEDIUM (Daily Review)

#### 8. Elevated Error Rates
- 5xx errors spike (>1% of traffic)
- Database connection errors
- OpenAI API errors

#### 9. Configuration Issues
- Missing environment variables
- Invalid JWT tokens
- Database migration failures

#### 10. Performance Anomalies
- API response time >5s
- Database query time >3s
- Memory/CPU spikes

---

## Log Sanitization

**CRITICAL**: Never log sensitive data. Use `lib/logger.ts` sanitization helpers.

### ❌ NEVER Log These:
- JWT tokens (full or partial)
- Password hashes
- API keys (OpenAI, Supabase service role)
- User emails (use user ID instead)
- Credit card numbers
- Personal health information (PHI)
- Full request bodies (may contain secrets)

### ✅ Safe to Log:
- User IDs (UUIDs)
- Endpoint paths
- HTTP methods
- Status codes
- Timestamps
- Sanitized error messages
- Request metadata (IP, user agent - sanitized)

### Example: Sanitized Logging

```typescript
// ❌ BAD - Logs sensitive data
console.log('Auth failed:', req.headers.authorization);
console.log('User data:', { email: user.email, password: user.password });

// ✅ GOOD - Sanitized logging
logger.warn('Authentication failed', {
  userId: sanitizeUserId(user.id),
  endpoint: req.url,
  method: req.method
});

logger.info('User action', {
  userId: sanitizeUserId(user.id),
  action: 'meal_created',
  metadata: sanitizeRequestBody(req.body)
});
```

---

## Alerting Rules

### Real-Time Alerts (Slack/Email/PagerDuty)

#### Critical Events (Immediate)
```yaml
Alert: Authentication Bypass Detected
Condition: auth_bypass_detected event logged
Channel: #security-critical + PagerDuty
Response Time: Immediate

Alert: Mass Unauthorized Access
Condition: >5 unauthorized_access_attempt in 5min from same user
Channel: #security-alerts
Response Time: 5 minutes

Alert: Privilege Escalation Attempt
Condition: privilege_escalation_attempt event logged
Channel: #security-critical + PagerDuty
Response Time: Immediate
```

#### High Priority Events (Within 1 Hour)
```yaml
Alert: Repeated Auth Failures
Condition: >10 auth failures in 10min for same email
Channel: #security-alerts
Response Time: 1 hour

Alert: Rate Limit Violations
Condition: >5 rate_limit_violation events in 1hr from same user
Channel: #api-monitoring
Response Time: 1 hour

Alert: Elevated 5xx Errors
Condition: 5xx error rate >1% of traffic for 5 minutes
Channel: #platform-alerts
Response Time: 30 minutes
```

#### Medium Priority (Daily Review)
```yaml
Alert: Daily Security Summary
Condition: Scheduled daily at 9am
Channel: #security-daily
Contains:
  - Total auth failures (last 24h)
  - Unique users with 403/404 responses
  - Rate limit violations by endpoint
  - AI usage statistics
  - Top error messages
```

### Implementation with Vercel Log Drains

```javascript
// vercel.json (example - requires Vercel Pro)
{
  "logDrains": [
    {
      "name": "security-logs",
      "type": "axiom", // or "datadog", "logtail", etc.
      "filters": ["error", "critical"],
      "projectId": "your-project-id"
    }
  ]
}
```

### Implementation with Sentry

```typescript
// apps/web/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  beforeSend(event, hint) {
    // Sanitize before sending to Sentry
    if (event.request) {
      delete event.request.headers?.authorization;
      delete event.request.cookies;
    }
    return event;
  },

  // Tag security events
  integrations: [
    new Sentry.Integrations.Breadcrumbs({
      console: false, // Don't capture console logs (may contain secrets)
    }),
  ],
});
```

---

## Monitoring Tools Setup

### Recommended Tools

#### 1. **Vercel Analytics** (Built-in)
- **Cost**: Included with Pro plan
- **Monitors**: Function errors, performance, traffic patterns
- **Setup**: Enabled by default

#### 2. **Supabase Logs** (Built-in)
- **Cost**: Free tier includes 7 days retention
- **Monitors**: Database queries, RLS violations, auth events
- **Setup**: Dashboard → Logs

#### 3. **Sentry** (Recommended)
- **Cost**: Free tier: 5k events/month
- **Monitors**: Application errors, performance issues
- **Setup**:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard -i nextjs
  ```

#### 4. **Axiom or Logtail** (Optional - Enhanced Logging)
- **Cost**: ~$25/month for starter plan
- **Monitors**: Custom application logs, security events
- **Setup**: Vercel Log Drains integration

#### 5. **Uptime Monitoring** (Recommended)
- **Options**: UptimeRobot (free), Checkly ($20/mo), Pingdom
- **Monitors**: API availability, response times
- **Setup**: Configure HTTP monitors for:
  - `https://your-app.com/api/health`
  - `https://your-app.com/`

---

## Incident Response

### Response Playbook

#### 1. Detection Phase
- Alert received via Slack/email/PagerDuty
- Check severity level
- Gather initial context from logs

#### 2. Investigation Phase
```bash
# Check Vercel logs
vercel logs --follow --app production

# Check Supabase logs
# Dashboard → Logs → Filter by error level

# Check specific user activity
# Dashboard → Auth → Search user ID
```

#### 3. Containment Phase

**For user account compromise:**
```sql
-- Temporarily disable user (run in Supabase SQL Editor)
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '24 hours'
WHERE id = 'user-id-here';

-- Revoke all sessions
DELETE FROM auth.sessions
WHERE user_id = 'user-id-here';
```

**For API vulnerability:**
```bash
# Rollback to previous deployment
vercel rollback

# Or deploy hotfix
git revert HEAD
git push origin main
```

#### 4. Eradication Phase
- Fix vulnerability
- Deploy patch
- Run security test scripts to verify fix
- Update RLS policies if needed

#### 5. Recovery Phase
- Restore normal operations
- Unban affected users (if false positive)
- Monitor for 24 hours

#### 6. Post-Incident Phase
- Document incident in `docs/incidents/YYYY-MM-DD-description.md`
- Update security policies
- Add new monitoring/alerting rules
- Team retrospective

---

## Metrics & Dashboards

### Key Security Metrics (Weekly Review)

#### Authentication & Authorization
- Failed login attempts (trend over time)
- 401/403 responses by endpoint
- Average time-to-detect unauthorized access
- False positive rate for security alerts

#### API Security
- Rate limit violations by endpoint
- Average API response time
- Error rate by endpoint (4xx, 5xx)
- Most commonly hit rate limits

#### Data Access Patterns
- Queries per user (P50, P95, P99)
- Unusual access patterns flagged
- Cross-user access attempts (should be 0)

#### AI Usage
- OpenAI API calls per day
- Average prompt length
- Cost per user
- Suspicious prompts detected

### Example Dashboard Queries (Vercel Analytics)

```sql
-- Top 10 endpoints with 403 responses
SELECT path, COUNT(*) as count
FROM requests
WHERE status = 403
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY path
ORDER BY count DESC
LIMIT 10;

-- Users with elevated error rates
SELECT userId, COUNT(*) as errors
FROM requests
WHERE status >= 400
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY userId
HAVING errors > 100
ORDER BY errors DESC;
```

### Supabase Dashboard Queries

```sql
-- RLS policy violations (users trying to access other users' data)
-- Check logs for: "RLS policy violation" or 403 responses

-- Unusual query patterns
SELECT
  query,
  COUNT(*) as frequency,
  AVG(execution_time_ms) as avg_time_ms
FROM postgres_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY query
HAVING COUNT(*) > 100
ORDER BY frequency DESC;
```

---

## Checklist: Setting Up Monitoring

### Initial Setup (One-Time)

- [ ] Install Sentry: `npx @sentry/wizard -i nextjs`
- [ ] Configure sanitized logging: Create `lib/logger.ts`
- [ ] Add security event logging to API routes
- [ ] Set up Vercel Analytics (Pro plan)
- [ ] Enable Supabase log retention (7+ days)
- [ ] Configure uptime monitoring (UptimeRobot or similar)
- [ ] Create Slack channel: `#security-alerts`
- [ ] Document incident response team contacts

### Weekly Tasks

- [ ] Review security metrics dashboard
- [ ] Check for unusual access patterns
- [ ] Review rate limit violations
- [ ] Check OpenAI usage/costs
- [ ] Review Sentry error trends

### Monthly Tasks

- [ ] Review and update alerting thresholds
- [ ] Test incident response procedures
- [ ] Audit log sanitization (no secrets in logs)
- [ ] Review security documentation for updates
- [ ] Check for new vulnerabilities in dependencies

---

## Additional Resources

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Supabase Monitoring Guide](https://supabase.com/docs/guides/platform/logs)
- [Vercel Log Drains](https://vercel.com/docs/concepts/observability/log-drains)
- [Sentry Best Practices](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## Related Documents

- [SECURITY_SECRETS_RUNBOOK.md](./SECURITY_SECRETS_RUNBOOK.md) - Secret rotation procedures
- [SECURITY_BACKUP_STRATEGY.md](./SECURITY_BACKUP_STRATEGY.md) - Backup and recovery
- [SECURITY_FINAL_AUDIT.md](./SECURITY_FINAL_AUDIT.md) - Complete security audit report
