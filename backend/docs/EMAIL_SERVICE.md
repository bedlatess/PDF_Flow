# Email Service Documentation

## Overview

PDF-Flow uses [Resend](https://resend.com) for all transactional emails. The email service is fully integrated with the authentication, payment, and user engagement flows.

## Features

### ✅ Implemented Email Types

1. **Welcome Email** - Sent when user registers
2. **Password Reset Email** - Sent when user requests password reset
3. **Subscription Confirmation Email** - Sent when user upgrades to Pro
4. **Churn Prevention Email** - Sent to inactive users (7/30/90 days)

### 📧 Email Templates

All emails include:
- Responsive HTML design
- Plain text fallback
- Brand colors and styling
- Call-to-action buttons
- Security notices (for sensitive emails)

## Configuration

### Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxx

# Optional (with defaults)
EMAIL_FROM=PDF-Flow <noreply@pdf-flow.com>
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_TOKEN_EXPIRE_HOURS=1
```

### Getting Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use test mode)
3. Generate API key from dashboard
4. Add to `.env` file

## API Endpoints

### Password Reset Flow

#### 1. Request Password Reset

```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with that email, a password reset link has been sent"
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Email sent in background task (non-blocking)
- Reset token expires in 1 hour

#### 2. Reset Password

```bash
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password successfully reset"
}
```

**Errors:**
- `400` - Invalid or expired token
- `400` - User not found or inactive

## Automated Email Tasks

### Celery Beat Schedule

The following tasks run automatically:

#### 1. Churn Prevention Emails

**Task:** `send_churn_prevention_emails`  
**Schedule:** Every 24 hours  
**Purpose:** Re-engage inactive users

**Triggers:**
- 7 days inactive: First reminder
- 30 days inactive: Second reminder
- 90 days inactive: Final reminder

**Logic:**
```python
# Targets users inactive for exactly N days (within 1-hour window)
# Prevents duplicate emails
target_date_start = now - timedelta(days=7, hours=1)
target_date_end = now - timedelta(days=7)
```

#### 2. Subscription Expiry Reminders

**Task:** `send_subscription_expiry_reminders`  
**Schedule:** Every 12 hours  
**Purpose:** Remind users of upcoming renewal

**Triggers:**
- 7 days before subscription ends

### Running Celery Beat

```bash
# Start Celery worker
celery -A app.celery_worker worker --loglevel=info

# Start Celery beat scheduler (separate process)
celery -A app.celery_worker beat --loglevel=info
```

## Email Service Usage

### In Code

```python
from app.services.email_service import email_service

# Welcome email
await email_service.send_welcome_email(
    to="user@example.com",
    username="John Doe"
)

# Password reset
await email_service.send_password_reset_email(
    to="user@example.com",
    username="John Doe",
    reset_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
)

# Subscription confirmation
await email_service.send_subscription_confirmation_email(
    to="user@example.com",
    username="John Doe",
    plan="Pro",
    amount=9.9,
    billing_period="monthly"
)

# Churn prevention
await email_service.send_churn_prevention_email(
    to="user@example.com",
    username="John Doe",
    days_inactive=30
)
```

### With Background Tasks (Recommended)

```python
from fastapi import BackgroundTasks

@router.post("/register")
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Create user...
    
    # Send email in background (non-blocking)
    background_tasks.add_task(
        email_service.send_welcome_email,
        to=new_user.email,
        username=new_user.full_name or new_user.email.split('@')[0]
    )
    
    return new_user
```

## Testing

### Without Real API Key

If `RESEND_API_KEY` is not set, emails are logged but not sent:

```python
logger.info(f"[EMAIL DISABLED] Would send to {to}: {subject}")
logger.debug(f"HTML content: {html}")
```

This is useful for:
- Local development
- Testing environments
- CI/CD pipelines

### With Test API Key

Resend provides test mode that doesn't send real emails:

1. Use test API key: `re_test_xxxxx`
2. Emails appear in Resend dashboard
3. No actual delivery

## Security Features

### Password Reset Security

1. **Token Expiry:** 1 hour
2. **One-time Use:** Token type checked (`password_reset`)
3. **Email Enumeration Prevention:** Always returns success
4. **Secure Links:** HTTPS in production

### Email Content Security

1. **No Sensitive Data:** Never include passwords or API keys
2. **Secure Links:** All URLs use FRONTEND_URL from config
3. **HMAC Signing:** (Future) Sign email links to prevent tampering

## Monitoring

### Logs

All email operations are logged:

```python
logger.info(f"Email sent successfully to {to}: {subject}")
logger.error(f"Failed to send email to {to}: {response.status_code}")
```

### Metrics

Track email performance:
- Delivery rate
- Open rate (if Resend webhooks configured)
- Click-through rate
- Bounce rate

### Error Handling

```python
try:
    await email_service.send_welcome_email(...)
except Exception as e:
    logger.error(f"Error sending email: {str(e)}")
    # Email failure doesn't block user registration
```

## Frontend Integration

### Password Reset Flow (Frontend)

```typescript
// 1. User requests reset
await authAPI.forgotPassword({ email: 'user@example.com' })

// 2. User receives email, clicks link
// Link format: http://localhost:5173/auth/reset-password?token=eyJ...

// 3. Frontend extracts token, shows reset form
const token = route.query.token

// 4. User submits new password
await authAPI.resetPassword({
  token: token,
  new_password: 'NewPassword123'
})
```

### Frontend Routes Needed

```typescript
// src/router/index.ts
{
  path: '/auth/reset-password',
  name: 'ResetPassword',
  component: () => import('@/views/auth/ResetPassword.vue')
}
```

## Future Enhancements

### Planned Features

- [ ] Email verification flow
- [ ] Two-factor authentication emails
- [ ] Weekly digest emails
- [ ] Marketing campaigns
- [ ] Email preferences/unsubscribe
- [ ] Email templates in database
- [ ] A/B testing support

### Advanced Features

- [ ] Send time optimization
- [ ] Personalized content
- [ ] Dynamic templates
- [ ] Multi-language support
- [ ] Email analytics dashboard

## Troubleshooting

### Email Not Sending

1. **Check API Key:**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Check Logs:**
   ```bash
   docker-compose logs backend | grep EMAIL
   ```

3. **Verify Domain:**
   - Resend requires domain verification for production
   - Test mode works without verification

### Email Delayed

1. **Background Tasks:** Emails sent via background tasks are non-blocking
2. **Celery Queue:** Check Celery worker is running
3. **Rate Limits:** Resend has rate limits (check plan)

### Email in Spam

1. **SPF/DKIM:** Configure in Resend dashboard
2. **Domain Reputation:** Use verified domain
3. **Content:** Avoid spam trigger words

## Related Files

- `app/services/email_service.py` - Email service implementation
- `app/tasks/email_tasks.py` - Automated email tasks
- `app/api/v1/endpoints/auth.py` - Password reset endpoints
- `app/api/v1/endpoints/payment.py` - Subscription email integration
- `app/core/config.py` - Email configuration

## Support

For issues with Resend:
- [Documentation](https://resend.com/docs)
- [Support](https://resend.com/support)
- [Status Page](https://status.resend.com)
