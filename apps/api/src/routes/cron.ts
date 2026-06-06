import { Router } from 'express';
import { processIngestionJobs } from '../workers/ingestionWorker.js';
import {
  checkAndDeliverAlerts,
  checkIntegrationsHealth,
  triggerModelRetrain,
  sendWeeklyEmailDigest,
} from '../workers/alertWorker.js';

const router = Router();

// Middleware to secure cron endpoints
router.use((req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET /cron/ingest - Processes queued ingestion jobs
router.get('/ingest', async (req, res) => {
  try {
    console.log('[Cron] Triggered ingestion queue processing...');
    await processIngestionJobs();
    res.json({ status: 'success', message: 'Ingestion queue processed' });
  } catch (err: any) {
    console.error('[Cron] Ingestion queue processing failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /cron/alerts - Checks and delivers health alerts
router.get('/alerts', async (req, res) => {
  try {
    console.log('[Cron] Triggered alert checks...');
    await checkAndDeliverAlerts();
    res.json({ status: 'success', message: 'Alerts processed' });
  } catch (err: any) {
    console.error('[Cron] Alert checks failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /cron/health-check - Checks integrations health
router.get('/health-check', async (req, res) => {
  try {
    console.log('[Cron] Triggered integrations health check...');
    await checkIntegrationsHealth();
    res.json({ status: 'success', message: 'Integrations health checked' });
  } catch (err: any) {
    console.error('[Cron] Integrations health check failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /cron/retrain - Trigger weekly model retrain
router.get('/retrain', async (req, res) => {
  try {
    console.log('[Cron] Triggered weekly ML retraining...');
    await triggerModelRetrain();
    res.json({ status: 'success', message: 'Weekly retraining triggered' });
  } catch (err: any) {
    console.error('[Cron] Weekly retraining failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /cron/digest - Send weekly Monday morning digest emails
router.get('/digest', async (req, res) => {
  try {
    console.log('[Cron] Triggered weekly Monday email digest...');
    await sendWeeklyEmailDigest();
    res.json({ status: 'success', message: 'Weekly digest sent' });
  } catch (err: any) {
    console.error('[Cron] Weekly digest failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
