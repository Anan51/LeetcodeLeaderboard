const GITHUB_API = 'https://api.github.com';

export class GithubRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GithubRequestError';
    this.status = status;
  }
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'leetcode-leaderboard',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: githubHeaders(),
    // Commit lists change; individual commit payloads are immutable but this
    // revalidate keeps a short server cache in front of either call.
    next: { revalidate: 600 },
  });

  if (response.status === 409) {
    return null;
  }

  if (response.status === 404) {
    throw new GithubRequestError(
      'Repository not found. It needs to be public.',
      404
    );
  }

  if (!response.ok) {
    let message = `GitHub request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // Ignore a non-JSON error body.
    }
    if (
      response.status === 429 ||
      (response.status === 403 && /rate limit/i.test(message))
    ) {
      throw new GithubRequestError(
        'GitHub rate limit reached. Set GITHUB_TOKEN to raise it.',
        429
      );
    }
    throw new GithubRequestError(message, response.status);
  }

  return response.json();
}

export async function listCommits(owner, repo) {
  const commits = [];

  for (let page = 1; page <= 50; page += 1) {
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=100&page=${page}`;
    const data = await githubJson(url);
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      commits.push({
        sha: item.sha,
        message: item.commit?.message || '',
        committedAt:
          item.commit?.committer?.date || item.commit?.author?.date || null,
      });
    }

    if (data.length < 100) break;
  }

  return commits;
}

export async function listCommitFiles(owner, repo, sha) {
  const files = [];

  for (let page = 1; page <= 20; page += 1) {
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}?per_page=100&page=${page}`;
    const data = await githubJson(url);
    const batch = data?.files || [];
    for (const file of batch) {
      files.push({
        filename: file.filename,
        status: file.status,
      });
    }
    if (batch.length < 100) break;
  }

  return files;
}

// Returns the number of submission blobs, or null when the tree is truncated
// and the count cannot be trusted.
export async function countSubmissionBlobs(owner, repo, isSubmissionPath) {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`;
  const data = await githubJson(url);
  if (!data) return 0;
  if (data.truncated) return null;

  return (data.tree || []).filter(
    (entry) => entry.type === 'blob' && isSubmissionPath(entry.path)
  ).length;
}
