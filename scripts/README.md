# Environment Scripts

Scripts for starting the full Simplyft Docker Compose environment.

## Windows

From the repository root:

```powershell
.\scripts\start-environment.ps1
```

If PowerShell execution policy blocks the script, use the CMD wrapper:

```cmd
scripts\start-environment.cmd
```

## Linux/macOS

From the repository root:

```bash
./scripts/start-environment.sh
```

If needed, make it executable first:

```bash
chmod +x scripts/start-environment.sh
```

## Options

- Windows: `-NoBuild` skips image rebuilds.
- Windows: `-FollowLogs` follows Docker Compose logs after startup.
- Linux/macOS: `--no-build` skips image rebuilds.
- Linux/macOS: `--follow-logs` follows Docker Compose logs after startup.

The scripts create `.env` from `.env.example` when `.env` does not exist, then run Docker Compose in detached mode.
