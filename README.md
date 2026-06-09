# 🤖 policybot

> A GitHub Action that automatically enforces repo policies — required PR descriptions, labels, linked issues, and more.

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/policybot/ci.yml?style=for-the-badge)](https://github.com/yourusername/policybot/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Codespace Ready](https://img.shields.io/badge/Codespace-Ready-green?style=for-the-badge&logo=github)](https://codespaces.new/yourusername/policybot)

---

## 🚀 What is policybot?

`policybot` is a GitHub Actions workflow that runs on every PR and enforces your team's contribution policies — blocking merges until requirements are met and posting helpful status comments automatically.

```bash
# Run policy checks locally against a PR
node src/policybot.js check --pr 42
node src/policybot.js check --pr 42 --repo owner/repo
node src/policybot.js list-policies
node src/policybot.js demo
```

## ✨ Policies Enforced
- 📝 PR description minimum length
- 🏷️ Required labels (e.g. `bug`, `feature`, `docs`)
- 🔗 Linked issue reference in PR body
- ✅ PR title follows conventional commit format
- 👥 Minimum number of reviewers requested
- 🧪 Required status checks must pass
- 📁 CHANGELOG.md updated for feature PRs

## 📊 Sample Policy Check Output
```
🤖 policybot — PR #42 Policy Check
────────────────────────────────────────
✅ PR title format valid
✅ Description length OK (243 chars)
❌ No linked issue found (add "Closes #XX")
❌ Missing required label (add: bug | feature | docs)
⚠️  No reviewers requested yet

2 failures — merge blocked until resolved
```

## 🏆 Achievement Scripts
```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```

## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)
