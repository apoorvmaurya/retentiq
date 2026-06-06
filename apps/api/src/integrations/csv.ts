import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';
import { db, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';

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

const csvRowSchema = z.object({
  customer_id: z.string().uuid('Invalid customer_id UUID format'),
  event_type: z.string().min(1, 'event_type is required'),
  occurred_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid occurred_at date format',
  }),
  feature: z.string().optional(),
  payload: z.string().optional(),
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

      // Query valid customer IDs for the org to check references
      const customersList = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(eq(schema.customers.orgId, orgId));

      const allowedCustomerIds = new Set(customersList.map((c) => c.id));

      const csvContent = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      const errors: { row: number; errors: string[] }[] = [];
      const validRows: any[] = [];

      parsed.data.forEach((row: any, idx: number) => {
        // Clean keys
        const cleanedRow: any = {};
        for (const key of Object.keys(row)) {
          cleanedRow[key.trim()] = row[key] ? row[key].trim() : '';
        }

        const validation = csvRowSchema.safeParse(cleanedRow);

        if (!validation.success) {
          errors.push({
            row: idx + 1,
            errors: validation.error.issues.map(
              (e) => `${e.path.join('.')}: ${e.message}`
            ),
          });
        } else {
          const rowData = validation.data;

          // Verify customer_id belongs to the org
          if (!allowedCustomerIds.has(rowData.customer_id)) {
            errors.push({
              row: idx + 1,
              errors: [
                `customer_id: Customer ID '${rowData.customer_id}' does not belong to your organization.`,
              ],
            });
          } else {
            validRows.push(rowData);
          }
        }
      });

      // If there are validation errors, return them
      if (errors.length > 0) {
        res.status(400).json({
          valid: validRows.length,
          errors: errors,
        });
        return;
      }

      // Bulk upsert / insert valid rows with deduplication check
      let inserted = 0;
      let skipped = 0;

      for (const row of validRows) {
        const occurredAtDate = new Date(row.occurred_at);

        let eventPayload: Record<string, any> = {};
        if (row.payload) {
          try {
            eventPayload = JSON.parse(row.payload);
          } catch (e) {
            eventPayload = { raw: row.payload };
          }
        }

        if (row.feature) {
          eventPayload.feature = row.feature;
        }

        // Deduplication check: check if event already exists
        const existing = await db
          .select()
          .from(schema.events)
          .where(
            and(
              eq(schema.events.customerId, row.customer_id),
              eq(schema.events.eventType, row.event_type),
              eq(schema.events.occurredAt, occurredAtDate)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.events).values({
            customerId: row.customer_id,
            orgId: orgId,
            eventType: row.event_type,
            source: 'csv_upload',
            payload: eventPayload,
            occurredAt: occurredAtDate,
          });
          inserted++;
        } else {
          skipped++;
        }
      }

      res.json({
        inserted,
        skipped,
        errors: [],
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
export { upload };
