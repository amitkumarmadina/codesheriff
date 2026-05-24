const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    repoName: { type: String, required: true },
    prNumber: { type: Number, required: true },
    prTitle: { type: String },
    prAuthor: { type: String },
    prUrl: { type: String },
    review: { type: String, required: true },
    rating: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);