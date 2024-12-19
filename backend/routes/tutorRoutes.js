import express from 'express';
import { getTutors, getTutorById, filterTutors } from '../controllers/tutorController.js';
import { body, query, validationResult } from 'express-validator';

const router = express.Router();

// Route to get tutors with pagination (handled in controller)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer')
], getTutors); // /api/tutors

// Route to get tutor by ID
router.get('/:id', getTutorById); // /api/tutors/:id

// Route to filter tutors by rating, cost, and availability
router.post('/filter', [
  body('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('maxRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('days').optional().isArray().withMessage('Days must be an array of strings'),
], filterTutors); // /api/tutors/filter

export default router;
