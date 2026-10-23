# Roadmap

## Milestone 1 — Local browser search
- [x] Install Ubuntu WSL2
- [x] Validate Docker Desktop and Compose
- [x] Start downloading Onyx Standard v4.9.4
- [ ] Verify all required Onyx services have started
- [ ] Open the interface through localhost
- [ ] Index a small set of synthetic documents
- [ ] Confirm results link back to correct sources

## Milestone 2 — Text extraction and OCR
- [ ] Compare native PDF extraction with Tesseract on a varied sample
- [ ] Measure OCR accuracy, latency and file-type coverage
- [ ] Integrate a controlled pipeline without changing originals

## Milestone 3 — Local AI
- [ ] Benchmark small local model(s) against host memory constraints
- [ ] Test source-grounded answers and hallucination handling
- [ ] Document model licenses, data flow and resource use

## Milestone 4 — Network pilot
- [ ] Choose read-only file ingestion method
- [ ] Validate updates/deletes and re-index behavior
- [ ] Verify ACL enforcement and authentication end-to-end
- [ ] Harden backups, access logs, updates and operational procedures
