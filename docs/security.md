# Security and privacy

This repository is intentionally generic and safe for eventual public visibility.

## Never commit
- Passwords, API keys, bearer tokens, `.env` files or generated Onyx secrets.
- Internal IP addresses, network share paths, usernames, personal records or real business documents.
- Raw logs, database snapshots, indexed content or embeddings derived from confidential files.

## Controls for evaluation
1. Search only synthetic documents first.
2. Connect a specifically approved folder as read-only.
3. Ensure search results cannot disclose documents to unauthorized users; test with distinct accounts.
4. Keep Docker services on localhost unless exposure is deliberate, firewalled and authenticated.
5. Back up application configuration and test restoration before scaling.

## Public repository checklist
Review `git diff`, files staged for commit, GitHub issue attachments and screenshots for identifiers or sensitive information.
