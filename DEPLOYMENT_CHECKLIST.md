# ✅ Production Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## 📋 Pre-Deployment

### Code Quality
- [ ] All tests passing locally (`npm test`)
- [ ] Lint errors fixed (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

### Environment Setup
- [ ] `.env.production.example` reviewed
- [ ] All required API keys obtained
- [ ] Supabase project configured
- [ ] Google APIs enabled
- [ ] Upstash Redis database created (optional)

### Database
- [ ] All migrations applied
- [ ] Database backups configured
- [ ] Row Level Security (RLS) policies reviewed
- [ ] Test data removed/cleaned

### Security
- [ ] API keys restricted to production domains
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Secrets stored securely (not in code)

---

## 🚂 ML Service Deployment

### Railway/Fly.io/Render
- [ ] Platform account created
- [ ] ML service deployed
- [ ] Environment variables set:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `POSTGRES_URL`
  - [ ] `ML_SERVICE_HOST`
  - [ ] `ML_SERVICE_PORT`
- [ ] Public domain generated
- [ ] Health check passing (`/health`)
- [ ] API docs accessible (`/docs`)
- [ ] Google Trends endpoint working

### Testing ML Service
- [ ] `curl https://ml-service-url.com/health`
- [ ] `curl https://ml-service-url.com/api/trends/trending-searches?region=united_states`
- [ ] Check logs for errors
- [ ] Verify performance (< 500ms response)

**ML Service URL:**
```
https://________________________.com
```

---

## ▲ Vercel Deployment

### Project Setup
- [ ] Vercel account created
- [ ] Project connected to GitHub repo
- [ ] Build settings configured
- [ ] Framework preset: Next.js
- [ ] Root directory: `./`

### Environment Variables (Vercel Dashboard)
Set for: Production, Preview, Development

#### Required
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `POSTGRES_URL`
- [ ] `PAYLOAD_SECRET` (32+ chars)
- [ ] `NEXT_PUBLIC_GOOGLE_API_KEY`
- [ ] `GOOGLE_AI_API_KEY`
- [ ] `ML_SERVICE_URL` (from ML deployment)

#### Recommended
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`

#### Optional
- [ ] `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`

### Deployment
- [ ] First deployment successful
- [ ] Production URL accessible
- [ ] Build logs reviewed
- [ ] No build errors or warnings

### GitHub Integration
- [ ] Automatic deployments enabled
- [ ] Preview deployments for PRs enabled
- [ ] Branch deployments configured

---

## 🌐 Custom Domain

### DNS Configuration
- [ ] Domain purchased
- [ ] DNS records added:
  - [ ] A record: `@` → `76.76.21.21`
  - [ ] CNAME: `www` → `cname.vercel-dns.com`
- [ ] Domain added in Vercel Dashboard
- [ ] DNS propagation verified
- [ ] SSL certificate issued (automatic)

### Domain Testing
- [ ] `https://yourdomain.com` accessible
- [ ] `https://www.yourdomain.com` accessible
- [ ] HTTPS enforced (HTTP redirects)
- [ ] No mixed content warnings

**Production Domain:**
```
https://________________________.com
```

---

## ✅ Post-Deployment Verification

### Homepage
- [ ] Loads correctly
- [ ] No layout issues
- [ ] Images loading
- [ ] Navigation works
- [ ] Mobile responsive

### Search & Core Features
- [ ] Search functionality works
- [ ] Filters work correctly
- [ ] Destination pages load
- [ ] Map view displays
- [ ] User authentication works

### Google Trends Integration
- [ ] "Trending Google Searches" section appears
- [ ] Trending searches display
- [ ] Region selector works
- [ ] Data updates correctly
- [ ] No rate limit errors

### API Endpoints
- [ ] `/api/health` responds
- [ ] `/api/trending` works
- [ ] `/api/trending/google` works
- [ ] ML service endpoints work
- [ ] No 500 errors

### Performance
- [ ] Page load time < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] Lighthouse score:
  - [ ] Performance: 80+
  - [ ] Accessibility: 90+
  - [ ] SEO: 90+
  - [ ] Best Practices: 90+

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Console Errors
- [ ] No JavaScript errors
- [ ] No failed network requests
- [ ] No 404 errors
- [ ] No CORS errors

---

## 📊 Monitoring Setup

### Vercel Analytics
- [ ] Web Analytics enabled
- [ ] Speed Insights enabled
- [ ] Logs accessible

### Uptime Monitoring
- [ ] Service configured (UptimeRobot/Pingdom/Better Stack)
- [ ] Homepage monitored
- [ ] ML service `/health` monitored
- [ ] Alert notifications configured

### Error Tracking
- [ ] Sentry configured (optional)
- [ ] Error alerts set up
- [ ] Source maps uploaded

### Performance Monitoring
- [ ] Real User Monitoring (RUM) active
- [ ] Core Web Vitals tracking
- [ ] API response time monitoring

---

## 🔒 Security Review

### API Keys & Secrets
- [ ] No secrets in git history
- [ ] Google API keys restricted by domain
- [ ] Supabase service role key only in backend
- [ ] Environment variables use Vercel Secrets

### Headers & CORS
- [ ] Security headers configured
- [ ] CORS restricted to production domains
- [ ] CSP policy configured (if applicable)
- [ ] HTTPS only

### Rate Limiting
- [ ] Upstash Redis configured
- [ ] Rate limits tested
- [ ] Google Trends rate limit handling

### Database Security
- [ ] RLS policies enabled
- [ ] Service role key secured
- [ ] Database backups enabled
- [ ] Connection pooling configured

---

## 📝 Documentation

### Internal
- [ ] `.env.production.example` updated
- [ ] README.md updated with deployment info
- [ ] API endpoints documented
- [ ] Architecture diagram updated

### External (if applicable)
- [ ] User documentation updated
- [ ] Changelog published
- [ ] Release notes written

---

## 🎯 Go-Live Checklist

### Final Checks
- [ ] All above checklist items completed
- [ ] Stakeholders notified
- [ ] Support team briefed
- [ ] Rollback plan documented

### Launch
- [ ] Traffic routed to production
- [ ] Old version deprecated
- [ ] Monitoring active
- [ ] Team on standby

### Post-Launch (First 24 Hours)
- [ ] Error rates normal
- [ ] Performance metrics acceptable
- [ ] User feedback monitored
- [ ] No critical bugs

### Post-Launch (First Week)
- [ ] Usage analytics reviewed
- [ ] Google Trends integration performing well
- [ ] ML service costs within budget
- [ ] Database performance acceptable
- [ ] No security incidents

---

## 🐛 Rollback Plan

If critical issues occur:

### Immediate Steps
1. [ ] Revert to previous Vercel deployment
2. [ ] Check ML service status
3. [ ] Review error logs
4. [ ] Notify stakeholders

### Vercel Rollback
```bash
# Via Dashboard: Deployments → Select previous → Promote to Production

# Via CLI:
vercel rollback
```

### ML Service Rollback
```bash
# Railway:
railway rollback

# Fly.io:
flyctl releases list
flyctl releases rollback <version>

# Render:
# Via Dashboard: Rollback button
```

---

## 📞 Support Contacts

### Emergency Contacts
- **DevOps Lead:** ___________________
- **Backend Lead:** ___________________
- **Frontend Lead:** ___________________

### Service Providers
- **Vercel Support:** vercel.com/support
- **Railway Support:** railway.app/help
- **Supabase Support:** supabase.com/support

---

## 🎉 Deployment Complete!

Once all items are checked:

```
✅ Production deployment successful!

Production URL: https://________________________.com
ML Service URL: https://________________________.com
Deployment Date: ____________________
Deployed By: ____________________
```

### Next Steps:
1. Monitor for first 24 hours
2. Collect user feedback
3. Plan next iteration
4. Schedule post-mortem (if issues)

---

**Keep this checklist for future deployments!**
