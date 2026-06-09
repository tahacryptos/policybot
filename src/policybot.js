#!/usr/bin/env node
// 🤖 policybot — GitHub PR Policy Enforcer

const https  = require('https');
const { execSync } = require('child_process');

const GREEN  = '\x1b[32m'; const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m'; const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';  const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

// ── Policy definitions ────────────────────────────────────
const POLICIES = [
  {
    id: 'P001',
    name: 'PR title format',
    description: 'PR title must follow conventional commit format',
    check: (pr) => {
      const re = /^(feat|fix|docs|style|refactor|test|chore|ci|build|perf|revert)(\(.+\))?!?:\s.+/i;
      return { pass: re.test(pr.title), detail: `Title: "${pr.title}"` };
    },
  },
  {
    id: 'P002',
    name: 'PR description length',
    description: 'PR body must be at least 30 characters',
    check: (pr) => {
      const len = (pr.body || '').trim().length;
      return { pass: len >= 30, detail: `Body length: ${len} chars (min 30)` };
    },
  },
  {
    id: 'P003',
    name: 'Linked issue reference',
    description: 'PR body must reference an issue (Closes #N, Fixes #N)',
    check: (pr) => {
      const re = /(closes|fixes|resolves)\s+#\d+/i;
      return { pass: re.test(pr.body || ''), detail: 'Add "Closes #XX" or "Fixes #XX" to PR body' };
    },
  },
  {
    id: 'P004',
    name: 'Required label',
    description: 'PR must have at least one label: bug, feature, docs, chore',
    check: (pr) => {
      const required = ['bug', 'feature', 'docs', 'chore', 'enhancement'];
      const labels   = (pr.labels || []).map(l => l.name?.toLowerCase());
      const hasOne   = required.some(r => labels.includes(r));
      return { pass: hasOne, detail: `Labels: [${labels.join(', ') || 'none'}]` };
    },
  },
  {
    id: 'P005',
    name: 'Reviewer assigned',
    description: 'At least one reviewer must be requested',
    check: (pr) => {
      const count = (pr.requested_reviewers || []).length;
      return { pass: count > 0, detail: `Reviewers requested: ${count}` };
    },
  },
  {
    id: 'P006',
    name: 'No WIP in title',
    description: 'PR title should not contain WIP or Draft',
    check: (pr) => {
      const re = /\b(WIP|wip|draft|DRAFT)\b/;
      return { pass: !re.test(pr.title), detail: 'Remove WIP/Draft from title when ready' };
    },
  },
];

function getToken() {
  try { return execSync('gh auth token 2>/dev/null', { encoding: 'utf8' }).trim(); }
  catch { return null; }
}

function ghAPI(endpoint, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path:     endpoint,
      headers:  { 'User-Agent': 'policybot/1.0', 'Accept': 'application/vnd.github.v3+json',
                  ...(token ? { Authorization: `token ${token}` } : {}) },
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', reject);
  });
}

function runPolicies(pr) {
  return POLICIES.map(p => {
    const result = p.check(pr);
    return { ...p, pass: result.pass, detail: result.detail };
  });
}

function printResults(results, prInfo) {
  const passes = results.filter(r => r.pass);
  const fails  = results.filter(r => !r.pass);

  console.log(`\n${CYAN}${BOLD}🤖 policybot — PR #${prInfo.number || 'N/A'}: ${(prInfo.title || '').slice(0, 50)}${NC}`);
  console.log('─'.repeat(65));

  results.forEach(r => {
    const icon  = r.pass ? `${GREEN}✅` : `${RED}❌`;
    const color = r.pass ? GREEN : RED;
    console.log(`${icon}${NC} ${r.name}`);
    if (!r.pass) console.log(`   ${DIM}${r.detail}${NC}`);
  });

  console.log(`\n${'─'.repeat(65)}`);
  if (!fails.length) {
    console.log(`${GREEN}${BOLD}✅ All policies passed — PR is ready to merge!${NC}\n`);
  } else {
    console.log(`${RED}${BOLD}❌ ${fails.length} polic${fails.length === 1 ? 'y' : 'ies'} failed — merge blocked${NC}\n`);
    console.log(`${BOLD}Required actions:${NC}`);
    fails.forEach(f => console.log(`  • ${f.description}`));
    console.log();
  }
  return fails.length === 0;
}

function listPolicies() {
  console.log(`\n${CYAN}${BOLD}🤖 policybot — Active Policies${NC}\n`);
  POLICIES.forEach((p, i) => {
    console.log(`  ${GREEN}${p.id}${NC}  ${BOLD}${p.name}${NC}`);
    console.log(`       ${DIM}${p.description}${NC}`);
  });
  console.log();
}

function runDemo() {
  const goodPR = {
    number: 42, title: 'feat(auth): add OAuth2 login support',
    body: 'Adds Google OAuth2 login flow.\n\nCloses #38\n\nTested locally with mock provider.',
    labels: [{ name: 'feature' }], requested_reviewers: [{ login: 'alice' }],
  };
  const badPR = {
    number: 99, title: 'WIP: stuff',
    body: 'some changes',
    labels: [], requested_reviewers: [],
  };

  console.log(`${BOLD}--- Good PR Example ---${NC}`);
  printResults(runPolicies(goodPR), goodPR);
  console.log(`${BOLD}--- Bad PR Example ---${NC}`);
  printResults(runPolicies(badPR), badPR);
}

const args  = process.argv.slice(2);
const cmd   = args[0] || 'demo';
const prNum = args[args.indexOf('--pr') + 1];
const repo  = args[args.indexOf('--repo') + 1];
const token = getToken();

console.log(`\n${CYAN}${BOLD}🤖 policybot${NC}\n`);

(async () => {
  if (cmd === 'demo') {
    runDemo();
  } else if (cmd === 'list-policies') {
    listPolicies();
  } else if (cmd === 'check') {
    if (prNum && token) {
      const targetRepo = repo || execSync('gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null', { encoding: 'utf8' }).trim();
      console.log(`${DIM}Fetching PR #${prNum} from ${targetRepo}...${NC}\n`);
      const pr = await ghAPI(`/repos/${targetRepo}/pulls/${prNum}`, token).catch(() => null);
      if (!pr || pr.message) {
        console.log(`${YELLOW}Could not fetch PR. Running demo instead.${NC}\n`);
        runDemo();
      } else {
        const results = runPolicies(pr);
        const ok      = printResults(results, pr);
        if (!ok) process.exit(1);
      }
    } else {
      console.log(`${YELLOW}No PR number or token. Running demo.${NC}\n`);
      runDemo();
    }
  } else {
    console.log(`Usage:`);
    console.log(`  node src/policybot.js demo`);
    console.log(`  node src/policybot.js list-policies`);
    console.log(`  node src/policybot.js check --pr 42`);
    console.log(`  node src/policybot.js check --pr 42 --repo owner/repo\n`);
  }
})();
