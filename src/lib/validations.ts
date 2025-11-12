import { z } from 'zod';

// Order validation schema
export const orderSchema = z.object({
  tableNumber: z.string()
    .trim()
    .nonempty({ message: "Table number is required" })
    .max(10, { message: "Table number must be less than 10 characters" })
    .regex(/^[A-Za-z0-9\-]+$/, { message: "Table number can only contain letters, numbers, and hyphens" }),
  
  notes: z.string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional(),
  
  items: z.array(z.object({
    id: z.string().uuid({ message: "Invalid item ID" }),
    name: z.string().nonempty({ message: "Item name is required" }),
    price: z.number().positive({ message: "Price must be positive" }),
    quantity: z.number().int().positive({ message: "Quantity must be a positive integer" })
  })).min(1, { message: "Order must contain at least one item" }),
  
  total: z.number()
    .positive({ message: "Total must be positive" })
    .max(999999.99, { message: "Total amount is too large" }),
  
  appliedRewardId: z.string().uuid().optional(),
  discountAmount: z.number().min(0).optional(),
  originalAmount: z.number().positive().optional()
});

// Customer registration validation schema
export const customerRegistrationSchema = z.object({
  fullName: z.string()
    .trim()
    .nonempty({ message: "Full name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  
  phoneNumber: z.string()
    .trim()
    .regex(/^[0-9+\-\s()]+$/, { message: "Invalid phone number format" })
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal('')),
  
  referralCode: z.string()
    .trim()
    .max(20, { message: "Referral code must be less than 20 characters" })
    .optional()
    .or(z.literal(''))
});

// Menu item validation schema
export const menuItemSchema = z.object({
  name: z.string()
    .trim()
    .nonempty({ message: "Item name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  
  description: z.string()
    .trim()
    .max(500, { message: "Description must be less than 500 characters" })
    .optional()
    .or(z.literal('')),
  
  price: z.number()
    .positive({ message: "Price must be positive" })
    .max(9999.99, { message: "Price must be less than 9999.99" }),
  
  category: z.enum(['food', 'drink', 'dessert'], {
    errorMap: () => ({ message: "Category must be food, drink, or dessert" })
  }),
  
  imageUrl: z.string()
    .url({ message: "Invalid image URL" })
    .optional()
    .or(z.literal(''))
});

// Visit notes validation
export const visitNotesSchema = z.object({
  notes: z.string()
    .trim()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .optional()
});

// Auth validation schemas
export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password must be less than 72 characters" }),
  
  fullName: z.string()
    .trim()
    .nonempty({ message: "Full name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  
  phoneNumber: z.string()
    .trim()
    .regex(/^[0-9+\-\s()]+$/, { message: "Invalid phone number format" })
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal('')),
  
  dateOfBirth: z.string()
    .optional()
    .or(z.literal('')),
  
  referralCode: z.string()
    .trim()
    .max(20, { message: "Referral code must be less than 20 characters" })
    .optional()
    .or(z.literal(''))
});

export const signInSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  
  password: z.string()
    .nonempty({ message: "Password is required" })
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" })
    .max(100, { message: "Full name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Full name can only contain letters, spaces, hyphens, and apostrophes" }),
  
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  
  phoneNumber: z.string()
    .trim()
    .regex(/^[0-9+\-\s()]+$/, { message: "Invalid phone number format" })
    .min(7, { message: "Phone number must be at least 7 digits" })
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal(''))
});

// Password reset validation
export const passwordResetSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
});

// New password validation
export const newPasswordSchema = z.object({
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password must be less than 100 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Sanitization helper functions
export const sanitizeHtml = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeText = (text: string): string => {
  return text.trim().replace(/[<>]/g, '');
};
