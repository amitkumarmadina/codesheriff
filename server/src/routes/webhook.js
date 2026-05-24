const express = require('express');
const crypto = require('crypto');
const { handlePREvent } = require('../services/reviewService');

const router = express.Router();

function verifySignature(req) {
    const sig = req.headers['x-hub-signature-256'];
    if (!sig || !process.env.GITHUB_WEBHOOK_SECRET) return false;

    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');
    const signature = Buffer.from(sig);
    const expected = Buffer.from(digest);

    return signature.length === expected.length &&
        crypto.timingSafeEqual(signature, expected);
}

router.post('/webhook', async (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send('Signature mismatch');
    }

    const event = req.headers['x-github-event'];
    let payload;

    try {
        payload = JSON.parse(req.body.toString());
    } catch {
        return res.status(400).send('Invalid JSON payload');
    }

    if (event === 'pull_request' && payload.action === 'opened') {
        res.status(202).send('Processing');
        await handlePREvent(payload);
    } else {
        res.status(200).send('Event ignored');
    }
});

module.exports = router;
