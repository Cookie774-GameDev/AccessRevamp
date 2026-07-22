# Claude Code Installation

The repository root contains `CLAUDE.md` and `.claude/settings.json`. Claude Code discovers project memory when started from this repository or from the installed operations folder.

## Windows installation

Run `INSTALL_CLAUDE_OPERATIONS.cmd` from the repository root. The installer:

1. Resolves the real Windows Documents known folder.
2. Targets `Documents\Claude\AccessRevamp`.
3. Creates a timestamped backup of any previous installation.
4. Copies `CLAUDE.md`, `.claude/settings.json`, every agent/subagent file, every canonical `SKILL.md`, and the customer templates.
5. Runs required-file, JSON, 9 MB, secret-pattern, task-memory, and skill-count checks.
6. Writes `VERIFICATION_REPORT.json` and `INSTALLATION_RECEIPT.json` only after local verification passes.

Start Claude Code from the installed folder so `CLAUDE.md` loads automatically. Review effective permissions with `/permissions`.

## Important limitation

Local file verification does not activate Stripe, Icemail, Canva, Higgsfield, or active security testing. Those integrations remain fail-closed until authenticated end-to-end tests and the applicable payment, mailbox, rights, budget, and authorization gates pass.
