import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.issues.forEach(e => {
        const key = e.path.join('.') || 'general';
        errors[key] = errors[key] || [];
        errors[key].push(e.message);
      });
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.issues.forEach(e => {
        const key = e.path.join('.') || 'general';
        errors[key] = errors[key] || [];
        errors[key].push(e.message);
      });
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}
