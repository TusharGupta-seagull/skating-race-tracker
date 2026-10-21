import { z, type ZodType } from 'zod';
import { toNestErrors } from '@hookform/resolvers';
import type { FieldValues, Resolver } from 'react-hook-form';
import { parseTimeToMs } from '@/lib/time';

// ─── Zod v4 Resolver for react-hook-form ─────────────────────────────────────

export function zod4Resolver<TFieldValues extends FieldValues = FieldValues>(
  schema: ZodType<any, any, any>
): Resolver<TFieldValues> {
  return async (values, _context, options = { fields: {} } as any) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data as TFieldValues, errors: {} };
    }

    const rawErrors: Record<string, { message: string; type: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!rawErrors[path]) {
        rawErrors[path] = {
          message: issue.message,
          type: issue.code,
        };
      }
    }

    return {
      values: {},
      errors: toNestErrors(rawErrors, options),
    } as any;
  };
}


// ─── Time string refinement ────────────────────────────────────────────────────

const timeString = z.string().superRefine((val, ctx) => {
  if (!val.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Time is required' });
    return;
  }
  try {
    parseTimeToMs(val);
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: e instanceof Error ? e.message : 'Invalid time format',
    });
  }
});

const optionalTimeString = z.string().superRefine((val, ctx) => {
  if (!val.trim()) return; // optional
  try {
    parseTimeToMs(val);
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: e instanceof Error ? e.message : 'Invalid time format',
    });
  }
});

// ─── Top Performer ────────────────────────────────────────────────────────────

export const topPerformerSchema = z
  .object({
    id: z.string(),
    name: z.string().max(100).optional().default(''),
    time: optionalTimeString,
    rank: z.coerce.number().int().min(1).max(3),
  })
  .refine(
    (data) => {
      // If time was specified, performer name is required
      if (data.time && data.time.trim() && !data.name.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Performer name is required when time is specified',
      path: ['name'],
    }
  );

// ─── Race Form ────────────────────────────────────────────────────────────────

export const raceFormSchema = z.object({
  eventName: z.string().min(1, 'Event name is required').max(200),
  eventDate: z.string().min(1, 'Event date is required'),
  eventYear: z.coerce.number().int().min(1900).max(2100),
  categoryId: z.string().min(1, 'Category is required'),
  skaterTime: timeString,
  skaterRank: z.coerce.number().int().min(1, 'Rank must be at least 1'),
  topPerformers: z.array(topPerformerSchema).max(3),
  notes: z.string().max(2000).optional().default(''),
});

export type RaceFormSchema = z.infer<typeof raceFormSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
});

// ─── Backup ───────────────────────────────────────────────────────────────────

export const backupSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string(),
  races: z.array(
    z.object({
      id: z.string(),
      eventName: z.string(),
      eventDate: z.string(),
      eventYear: z.number(),
      categoryId: z.string(),
      skaterTimeMs: z.number().int().nonnegative(),
      skaterRank: z.number().int().positive(),
      topPerformers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          timeMs: z.number().int().nonnegative(),
          rank: z.number().int().min(1).max(3),
        })
      ),
      notes: z.string().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })
  ),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      isArchived: z.boolean(),
      createdAt: z.number(),
    })
  ),
});
