# Architecture

## Goal
Provide a browser-based knowledge search over explicitly approved local documents, with OCR and optional local LLM answering with citations.

```text
Read-only pilot source -> extraction/OCR -> Onyx Standard index -> browser search / cited answers
```

## Components
- **Onyx Standard:** indexing, search and RAG user interface.
- **Docker Desktop + WSL2:** local container runtime for the pilot.
- **Text extraction:** favor native PDF text extraction; use Tesseract for scans, after benchmark testing.
- **Local LLM:** optional, enabled only after validating memory and responsiveness.

## Security boundaries
- Begin with synthetic documents, then an explicitly approved read-only pilot directory.
- Do not mount production shares read/write.
- Do not assume the search service preserves SMB/NTFS user-level ACLs; verify permissions and identity propagation before multi-user access.
- Keep access bound to localhost during the pilot, and avoid public port forwarding.
- Never include live files, internal paths, credentials, screenshots with sensitive data or unredacted logs in this repository.

## Non-goals for the first milestone
- Bulk indexing multi-terabyte data.
- Production SSO, user provisioning or guaranteed per-document permissions.
- Automated writing to source folders.
