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

Start the environment and expose the site with ngrok:

```bash
./scripts/start-ngrok.sh
```

Stop the ngrok tunnel:

```bash
./scripts/stop-ngrok.sh
```

Reload only the frontend with:

```bash
./reload-frontend.sh
```

Manage the Angular frontend container with content-change aware rebuilds:

```bash
./frontend-angular.sh start
./frontend-angular.sh reload
./frontend-angular.sh watch
./frontend-angular.sh stop
```

If needed, make it executable first:

```bash
chmod +x frontend-angular.sh reload-frontend.sh scripts/start-environment.sh scripts/stop-environment.sh scripts/start-ngrok.sh scripts/stop-ngrok.sh scripts/reload-frontend.sh
```

## Options

- Windows: `-NoBuild` skips image rebuilds.
- Windows: `-FollowLogs` follows Docker Compose logs after startup.
- Windows: `-Volumes` removes Docker Compose volumes while stopping, deleting local database/model data.
- Linux/macOS: `--no-build` skips image rebuilds.
- Linux/macOS: `--follow-logs` follows Docker Compose logs after startup.
- Linux/macOS: `--volumes` removes Docker Compose volumes while stopping, deleting local database/model data.
- ngrok start: `--port PORT` exposes a different local port; `--no-start` skips starting Docker Compose; `--no-build` starts Docker Compose without rebuilding images.
- ngrok stop: `--environment` also stops Docker Compose; `--volumes` also removes Docker Compose volumes.
- Frontend reload: `--follow-logs` follows only frontend logs after recreation.
- Angular frontend manager: `--force` rebuilds even without content changes; `--follow-logs` follows frontend logs; `--interval SECONDS` changes watch polling.

The start scripts create `.env` from `.env.example` when `.env` does not exist, then run Docker Compose in detached mode. The stop scripts run `docker compose down` by default.
