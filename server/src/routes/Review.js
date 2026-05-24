const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { reviewCode } = require('../services/openaiService');
const router = express.Router();

// Mock reviews data to seed
const MOCK_SEEDS = [
    {
        repoName: "acme-org/backend-api",
        prNumber: 47,
        prTitle: "Add user authentication with JWT",
        prAuthor: "rahul-dev",
        prUrl: "https://github.com/acme-org/backend-api/pull/47",
        review: `## Summary
Adds JWT-based authentication middleware and login/signup routes.

## Bugs
- \`verifyToken\` middleware does not handle expired tokens — if the token is expired, \`jwt.verify\` throws but the catch block returns 200 OK instead of 401.
- Password is stored without hashing in \`createUser\`. Must use bcrypt before saving.

## Security
- **Critical**: \`JWT_SECRET\` is hardcoded as \`"mysecretkey"\` in \`auth.js\` line 12. Move this to an environment variable immediately.
- No rate limiting on \`/login\` endpoint — brute-force attacks are possible.

## Performance
None found.

## Suggestions
1. Use \`bcrypt.hash(password, 10)\` before \`user.save()\` in the signup handler.
2. Add express-rate-limit on auth routes: \`rateLimit({ windowMs: 15*60*1000, max: 10 })\`.
3. Return consistent error shapes: \`{ error: "message" }\` everywhere.`,
        rating: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 18) // 18m ago
    },
    {
        repoName: "acme-org/frontend",
        prNumber: 112,
        prTitle: "Refactor product listing page",
        prAuthor: "priya-ui",
        prUrl: "https://github.com/acme-org/frontend/pull/112",
        review: `## Summary
Breaks the monolithic ProductPage into smaller components and adds pagination.

## Bugs
None found.

## Security
None found.

## Performance
- \`fetchProducts\` is called inside a \`useEffect\` with no dependency array, causing an infinite re-render loop on the listing page.
- Product images are loaded at full resolution — add width/height constraints or use a CDN with resizing.

## Suggestions
1. Add \`[page]\` to the useEffect dependency array.
2. Memoize the \`filterProducts\` function with \`useMemo\` — it runs on every render including unrelated state changes.`,
        rating: 1,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) // 3h ago
    },
    {
        repoName: "my-org/data-pipeline",
        prNumber: 9,
        prTitle: "Add MongoDB aggregation for analytics",
        prAuthor: "saurabh-be",
        prUrl: "https://github.com/my-org/data-pipeline/pull/9",
        review: `## Summary
Introduces an aggregation pipeline to compute daily active user stats.

## Bugs
- The \`$match\` stage filters by \`createdAt\` but the field is named \`timestamp\` in the schema — this will silently return empty results.

## Security
None found.

## Performance
- Missing index on \`timestamp\` field — this aggregation will do a full collection scan on every cron run. Add \`db.events.createIndex({ timestamp: 1 })\`.

## Suggestions
1. Add an \`allowDiskUse: true\` option for large datasets.
2. Cache the aggregation result in Redis with a 1-hour TTL to avoid hammering MongoDB on every dashboard load.`,
        rating: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 11) // 11h ago
    }
];

router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const total = await Review.countDocuments();
        const repos = await Review.distinct('repoName');
        res.json({ totalReviews: total, totalRepos: repos.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/reviews/:id/rating', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const { rating } = req.body;
        const review = await Review.findByIdAndUpdate(
            req.params.id, { rating }, { new: true }
        );
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed mock reviews
router.post('/reviews/seed', async (req, res) => {
    try {
        await Review.deleteMany({});
        const seeded = await Review.create(MOCK_SEEDS);
        res.status(201).json({ message: 'Database seeded successfully', count: seeded.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all reviews
router.post('/reviews/clear', async (req, res) => {
    try {
        await Review.deleteMany({});
        res.json({ message: 'Database cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simulate a code review via AI
router.post('/reviews/simulate', async (req, res) => {
    const { repoName, prNumber, prTitle, prAuthor, prUrl, diff } = req.body;
    
    if (!diff) {
        return res.status(400).json({ error: 'diff is required for simulation' });
    }

    try {
        const review = await reviewCode(diff);
        const newReview = await Review.create({
            repoName: repoName || 'simulated/repo',
            prNumber: prNumber || Math.floor(Math.random() * 100) + 1,
            prTitle: prTitle || 'Simulated PR changes',
            prAuthor: prAuthor || 'simulated-developer',
            prUrl: prUrl || '#',
            review,
        });
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;