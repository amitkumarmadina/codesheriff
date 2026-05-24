const { getInstallationToken, getPRDiff, postReviewComment }
    = require('./githubService');
const { reviewCode } = require('./openaiService');
const Review = require('../models/Review');

async function handlePREvent(payload) {
    const { repository, pull_request, installation } = payload;
    const owner = repository.owner.login;
    const repo = repository.name;
    const prNum = pull_request.number;

    try {
        console.log(`Reviewing PR #${prNum} in ${owner}/${repo}`);

        const token = await getInstallationToken(installation.id);
        const diff = await getPRDiff(owner, repo, prNum, token);
        const review = await reviewCode(diff);

        await postReviewComment(owner, repo, prNum, review, token);

        await Review.create({
            repoName: repository.full_name,
            prNumber: prNum,
            prTitle: pull_request.title,
            prAuthor: pull_request.user.login,
            prUrl: pull_request.html_url,
            review,
        });

        console.log(`Done — review posted for PR #${prNum}`);
    } catch (err) {
        console.error('Review failed:', err.message);
    }
}

module.exports = { handlePREvent };