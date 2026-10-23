# Installation journal — Onyx Standard pilot

> This is a generic runbook. Version numbers are observations, not minimum supported versions.

## Environment validated (2026-10-23)
- Windows 11 with Ubuntu on WSL2.
- Docker Desktop with Ubuntu WSL integration enabled.
- Docker CLI 29.9.2 and Compose v5.6.1.
- `docker run --rm hello-world` completed successfully.
- Onyx installer v1.4.4 invoked for **Standard**; screenshot shows pulling version **v4.9.4** images. Completion/startup has **not yet been verified**.

## Installer
Use the upstream official documentation and review the script before running it. Example, not an unattended recommendation:

```bash
curl -fsSL https://onyx.app/install_onyx.sh -o /tmp/install_onyx.sh
less /tmp/install_onyx.sh
bash /tmp/install_onyx.sh
```

The installer indicated its configuration directory under `$HOME/.config/onyx`. Never commit contents of this directory; it can include credentials.

## Verification after pull
Confirm services are running using `docker ps` and check the URL/port reported by the installer. Only then test the UI in a browser. Do not claim the platform is available until tested.

## Resource note
The pilot host has 16 GB RAM and a GTX 1650. Standard indexing plus a local LLM may exceed practical memory capacity; stagger tasks and measure utilization before enabling OCR pipelines or model serving.

## Troubleshooting
If the Docker CLI reports socket permission denied in Ubuntu, enable Desktop WSL integration and verify group membership after a fresh shell session. Do not make `/var/run/docker.sock` world-writable.
