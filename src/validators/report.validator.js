import { z } from 'zod';

export const reportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
});
