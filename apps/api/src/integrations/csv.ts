import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { db, schema } from '../lib/db.js';
import { and, eq } from 'drizzle-orm';

const router = Router();

// Configure multer: memory storage, max 5MB, .csv only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.post(
  '/csv/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file provided', code: 'NO_FILE' });
        return;
      }

      const orgId = req.user!.org_id;
      const csvContent = req.file.buffer.toString('utf-8');

      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        res.status(400).json({ error: 'Failed to parse CSV file structure', code: 'INVALID_CSV' });
        return;
      }

      // Upsert integration status to 'active' for CSV
      const existing = await db
        .select()
        .from(schema.integrations)
        .where(and(eq(schema.integrations.orgId, orgId), eq(schema.integrations.provider, 'csv')))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.integrations).values({
          orgId,
          provider: 'csv',
          status: 'active',
          config: { type: 'manual_csv' },
          lastSyncedAt: new Date(),
        });
      } else {
        await db
          .update(schema.integrations)
          .set({ status: 'active', lastSyncedAt: new Date() })
          .where(eq(schema.integrations.id, existing[0].id));
      }

      const newJob = await db
        .insert(schema.jobs)
        .values({
          orgId,
          type: 'csv',
          payload: { csvContent },
          status: 'queued',
        })
        .returning();

      res.json({
        success: true,
        message: 'CSV file uploaded and queued for background processing.',
        jobId: newJob[0].id,
        status: 'queued',
        rowsQueued: parsed.data.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
export { upload };
