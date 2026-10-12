import { GithubRequestError } from '../../../lib/github';
import { getNeetcodeStreak } from '../../../lib/neetcode';

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const owner = (searchParams.get('owner') || '').trim();
  const repo = (searchParams.get('repo') || '').trim().replace(/\.git$/, '');

  if (!owner || !repo) {
    return json({ error: 'GitHub username and repository name are required' }, 400);
  }

  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) {
    return json({ error: 'Invalid GitHub username or repository name' }, 400);
  }

  try {
    const streak = await getNeetcodeStreak(owner, repo);
    return json(streak, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400',
    });
  } catch (error) {
    if (error instanceof GithubRequestError) {
      return json({ error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : 'Failed to load NeetCode streak';
    return json({ error: message }, 500);
  }
}
