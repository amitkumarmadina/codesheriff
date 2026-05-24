const OpenAI = require('openai');

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });
const geminiClient = process.env.GEMINI_API_KEY ? new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
}) : null;

const SYSTEM_PROMPT = `You are an expert senior software engineer doing a PR review.
Analyze the git diff and return a markdown review with these sections:

## Summary
One sentence about what this PR does.

## Bugs
List any logical errors, edge cases, or potential crashes.
Write "None found" if clean.

## Security
Look for: hardcoded secrets, injection risks, auth issues.
Write "None found" if clean.

## Performance
Look for: N+1 queries, inefficient loops, memory leaks.
Write "None found" if clean.

## Suggestions
2-3 concrete improvements with code examples if helpful.

Be specific. Reference exact line numbers or function names.`;

async function reviewCode(diff) {
    const truncatedDiff = diff.slice(0, 8000);

    // Try OpenAI first, fallback to Gemini if it fails or key is missing
    try {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('replace-')) {
            throw new Error('OpenAI API key not configured or is placeholder.');
        }

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Review this PR diff:\n\n${truncatedDiff}` }
            ],
            max_tokens: 1000,
        });

        return response.choices[0].message.content;
    } catch (err) {
        console.warn('OpenAI review failed, attempting Gemini fallback:', err.message);
        if (geminiClient) {
            const response = await geminiClient.chat.completions.create({
                model: 'gemini-2.5-flash',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Review this PR diff:\n\n${truncatedDiff}` }
                ],
                max_tokens: 1000,
            });
            return response.choices[0].message.content;
        }
        throw err;
    }
}

module.exports = { reviewCode };