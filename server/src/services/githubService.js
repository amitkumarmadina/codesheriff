const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

async function getInstallationToken(installationId) {
    const auth = createAppAuth({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
        installationId,
    });
    const { token } = await auth({ type: 'installation' });
    return token;
}

async function getPRDiff(owner, repo, pullNumber, token) {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        {
            owner, repo, pull_number: pullNumber,
            headers: { accept: 'application/vnd.github.diff' }
        }
    );
    return data;
}

async function postReviewComment(owner, repo, pullNumber, body, token) {
    const octokit = new Octokit({ auth: token });
    await octokit.pulls.createReview({
        owner, repo,
        pull_number: pullNumber,
        body,
        event: 'COMMENT',
    });
}

module.exports = { getInstallationToken, getPRDiff, postReviewComment };