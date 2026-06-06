import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Express middleware to validate req.body against a Zod schema.
 * Returns HTTP 422 with structured errors on validation failure.
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(422).json({
        error: 'Validation failed',
        fields,
      });
      return;
    }
    // Replace req.body with the validated and typed output
    req.body = result.data;
    next();
  };
};
