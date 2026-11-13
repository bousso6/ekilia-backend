import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Usage :
 * router.post('/', validate({ body: createLeadSchema }), controller)
 */
export const validate = (schemas = {}) =>
  asyncHandler(async (req, res, next) => {
    if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
    if (schemas.query) req.query = await schemas.query.parseAsync(req.query);
    if (schemas.params) req.params = await schemas.params.parseAsync(req.params);
    next();
  });