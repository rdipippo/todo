import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg,
      })),
    });
    return;
  }
  next();
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  handleValidationErrors,
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  handleValidationErrors,
];

export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  handleValidationErrors,
];

export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors,
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  handleValidationErrors,
];

export const createTodoValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 500 })
    .withMessage('Title must be 500 characters or fewer'),
  body('category_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('category_id must be a positive integer'),
  body('percent_complete')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('percent_complete must be an integer between 0 and 100'),
  handleValidationErrors,
];

export const updateTodoValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Title must be 500 characters or fewer'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean'),
  body('percent_complete')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('percent_complete must be an integer between 0 and 100'),
  body('category_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('category_id must be a positive integer'),
  handleValidationErrors,
];

export const reorderTodosValidation = [
  body('todoIds')
    .isArray({ min: 1 })
    .withMessage('todoIds must be a non-empty array'),
  body('todoIds.*')
    .isInt({ min: 1 })
    .withMessage('Each todoId must be a positive integer'),
  handleValidationErrors,
];

export const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or fewer'),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/)
    .withMessage('Color must be a valid hex color (e.g. #ff0000)'),
  handleValidationErrors,
];

export const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or fewer'),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/)
    .withMessage('Color must be a valid hex color (e.g. #ff0000)'),
  handleValidationErrors,
];

export const inviteValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('canManage').optional().isBoolean().withMessage('canManage must be a boolean'),
  body('permCreateTasks').optional().isBoolean().withMessage('permCreateTasks must be a boolean'),
  body('permEditTasks').optional().isBoolean().withMessage('permEditTasks must be a boolean'),
  body('permDeleteTasks').optional().isBoolean().withMessage('permDeleteTasks must be a boolean'),
  body('permAssignTasks').optional().isBoolean().withMessage('permAssignTasks must be a boolean'),
  handleValidationErrors,
];
