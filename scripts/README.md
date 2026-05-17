# Environment Scripts

Scripts for starting and stopping the full Simplyft Docker Compose environment.

## Windows

From the repository root:

```powershell
.\scripts\start-environment.ps1
```

Stop it with:

```powershell
.\scripts\stop-environment.ps1
```

If PowerShell execution policy blocks the script, use the CMD wrapper:

```cmd
scripts\start-environment.cmd
```

```cmd
scripts\stop-environment.cmd
```

## Linux/macOS

From the repository root:

```bash
./scripts/start-environment.sh
```

Stop it with:

```bash
./scripts/stop-environment.sh
```

If needed, make it executable first:

```bash
chmod +x scripts/start-environment.sh scripts/stop-environment.sh
```

## Options

- Windows: `-NoBuild` skips image rebuilds.
- Windows: `-FollowLogs` follows Docker Compose logs after startup.
- Windows: `-Volumes` removes Docker Compose volumes while stopping, deleting local database/model data.
- Linux/macOS: `--no-build` skips image rebuilds.
- Linux/macOS: `--follow-logs` follows Docker Compose logs after startup.
- Linux/macOS: `--volumes` removes Docker Compose volumes while stopping, deleting local database/model data.

The start scripts create `.env` from `.env.example` when `.env` does not exist, then run Docker Compose in detached mode. The stop scripts run `docker compose down` by default.
