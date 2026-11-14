import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { auth } from '../middlewares/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/index.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);
router.patch('/me', auth, validate({ body: updateProfileSchema }), authController.updateMe);
router.patch(
  '/me/password',
  auth,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);
router.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  authLimiter,
  validate({ body: resendVerificationSchema }),
  authController.resendVerification
);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

export default router;
