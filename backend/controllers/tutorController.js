import { Tutor } from '../utils/db.js';

// Get tutors by search query
export const getTutors = async (req, res) => {
  try {
    const { subject, location, page = 1, limit = 10 } = req.query;

    // Sanitize pagination values
    const pageNum = Math.max(1, parseInt(page));  // Ensure page is at least 1
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max limit 50

    // Sanitize filters
    const filters = {};
    if (subject && typeof subject === 'string') filters.subjects = subject;
    if (location && typeof location === 'string') filters.location = location;

    // Fetch tutors with pagination
    const tutors = await Tutor.find(filters)
      .skip((pageNum - 1) * limitNum)  // Pagination logic
      .limit(limitNum);               // Limit the number of results

    res.status(200).json(tutors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get tutor by ID
export const getTutorById = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    res.status(200).json(tutor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Filter tutors by rating, cost, or availability
export const filterTutors = async (req, res) => {
  try {
    const { minRating, maxRate, days } = req.body;

    const filters = {};
    if (minRating) filters.rating = { $gte: minRating };
    if (maxRate) filters.hourlyRate = { $lte: maxRate };
    if (days) filters.availability = { $in: days };

    const tutors = await Tutor.find(filters);
    res.status(200).json(tutors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
