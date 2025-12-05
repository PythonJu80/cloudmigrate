# Stripe Billing Setup Guide

Complete guide to setting up Stripe billing for CloudMigrate SaaS.

---

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification (required for live payments)
3. Note: You can use **Test Mode** while setting up

---

## 2. Get API Keys

1. Go to **Developers** → **API Keys**
2. Copy your keys:

| Key | Where to find | Use |
|-----|---------------|-----|
| Publishable key | `pk_test_...` or `pk_live_...` | Frontend (not needed for this app) |
| Secret key | `sk_test_...` or `sk_live_...` | Backend API calls |

Add to your `.env`:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
```

---

## 3. Create Products & Prices

### Navigate to Products
1. Go to **Products** → **Add Product**

### Create Business Plan

| Field | Value |
|-------|-------|
| Name | CloudMigrate Business |
| Description | For growing teams migrating to cloud |
| Pricing model | Standard pricing |
| Price | £79.00 |
| Billing period | Monthly |
| Tax behavior | Exclusive (add tax on top) |

Click **Save product**, then copy the **Price ID** (starts with `price_`)

### Create Enterprise Plan

| Field | Value |
|-------|-------|
| Name | CloudMigrate Enterprise |
| Description | For large organizations with complex needs |
| Pricing model | Standard pricing |
| Price | £299.00 |
| Billing period | Monthly |
| Tax behavior | Exclusive |

Click **Save product**, then copy the **Price ID**

### Add to `.env`:
```bash
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Set Up Webhooks

Webhooks notify your app when payments happen.

### For Local Development

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# Windows
scoop install stripe
```

2. Login to Stripe CLI:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:6080/api/billing/webhook
```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### For Production

1. Go to **Developers** → **Webhooks** → **Add endpoint**

2. Configure endpoint:

| Field | Value |
|-------|-------|
| Endpoint URL | `https://yourdomain.com/api/billing/webhook` |
| Description | CloudMigrate billing webhook |
| Listen to | Events on your account |

3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Click **Add endpoint**

5. Click **Reveal** under Signing secret and copy it

6. Add to production `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Configure Customer Portal

The customer portal lets users manage their subscription.

1. Go to **Settings** → **Billing** → **Customer portal**

2. Configure these settings:

### Functionality
| Setting | Recommended |
|---------|-------------|
| Invoices | ✅ Enabled |
| Customer update | ✅ Enabled |
| Payment methods | ✅ Enabled |
| Subscription cancellation | ✅ Enabled |
| Subscription pause | ❌ Disabled |
| Subscription update | ✅ Enabled |

### Cancellation
| Setting | Recommended |
|---------|-------------|
| Cancellation reason | ✅ Required |
| Proration behavior | Create prorations |
| Cancel at end of period | ✅ Enabled |

### Branding
- Upload your logo
- Set brand color to match your app

3. Click **Save**

---

## 6. Set Up Tax (Optional but Recommended)

1. Go to **Settings** → **Tax**
2. Click **Get started**
3. Add your business address
4. Enable **Stripe Tax** for automatic tax calculation
5. Set tax behavior to **Exclusive** (tax added on top of price)

---

## 7. Complete `.env` Configuration

Your final `.env` should include:

```bash
# Stripe (for billing)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx
```

For development/testing, use `sk_test_` keys instead.

---

## 8. Test the Integration

### Test Mode Cards

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | 3D Secure required |

Use any future expiry date and any 3-digit CVC.

### Test Flow

1. Start your app and Stripe CLI webhook forwarding
2. Go to `/billing`
3. Click **Upgrade to Business**
4. Complete checkout with test card `4242 4242 4242 4242`
5. Check:
   - Stripe Dashboard shows the subscription
   - Your database shows `plan: "PRO"`
   - Webhook logs show `checkout.session.completed`

### Test Webhook Events

```bash
# Trigger a test event
stripe trigger checkout.session.completed
```

---

## 9. Go Live Checklist

Before accepting real payments:

- [ ] Complete Stripe business verification
- [ ] Switch from `sk_test_` to `sk_live_` keys
- [ ] Update webhook endpoint to production URL
- [ ] Update webhook secret to production secret
- [ ] Test with a real card (refund yourself after)
- [ ] Set up email notifications in Stripe
- [ ] Configure invoice settings (logo, footer, etc.)
- [ ] Review and accept Stripe's terms of service

---

## 10. Monitoring & Alerts

### Set Up Email Alerts

1. Go to **Settings** → **Team and security** → **Email preferences**
2. Enable:
   - Successful payments
   - Failed payments
   - Disputes
   - Subscription changes

### Dashboard Monitoring

Key metrics to watch:
- **MRR** (Monthly Recurring Revenue)
- **Churn rate**
- **Failed payment rate**
- **Average revenue per user**

---

## Troubleshooting

### Webhook not receiving events

1. Check endpoint URL is correct
2. Verify webhook secret matches
3. Check server logs for errors
4. Use Stripe CLI to test locally

### Checkout not redirecting

1. Verify `NEXTAUTH_URL` is set correctly
2. Check browser console for errors
3. Verify price IDs are correct

### Subscription not updating in database

1. Check webhook logs in Stripe Dashboard
2. Verify `tenantId` is in session metadata
3. Check server logs for database errors

---

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billing` | GET | Get current plan and usage |
| `/api/billing/checkout` | POST | Create checkout session |
| `/api/billing/portal` | POST | Create customer portal session |
| `/api/billing/webhook` | POST | Handle Stripe webhooks |

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upgrade plan, update Neo4j limits |
| `customer.subscription.updated` | Handle plan changes |
| `customer.subscription.deleted` | Downgrade to FREE |
| `invoice.payment_succeeded` | Log successful payment |
| `invoice.payment_failed` | Log failed payment |

---

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- API Reference: https://stripe.com/docs/api
