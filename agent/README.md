# CloudMigrate Agent

A lightweight agent that runs on your local machine to enable the CloudMigrate AI assistant to analyze your files for cloud migration.

## Installation

### Download Binary

Download the appropriate binary for your system from the [releases page](https://github.com/cloudmigrate/agent/releases):

- **Linux (x64)**: `cloudmigrate-agent-linux-amd64`
- **Linux (ARM)**: `cloudmigrate-agent-linux-arm64`
- **macOS (Intel)**: `cloudmigrate-agent-darwin-amd64`
- **macOS (M1/M2)**: `cloudmigrate-agent-darwin-arm64`
- **Windows**: `cloudmigrate-agent-windows-amd64.exe`

### Quick Install (Linux/macOS)

```bash
# Download latest
curl -L https://cloudmigrate.io/agent/latest -o cloudmigrate-agent
chmod +x cloudmigrate-agent
sudo mv cloudmigrate-agent /usr/local/bin/
```

## Usage

### 1. Get Your API Key

Go to **Settings > Agent** in the CloudMigrate dashboard to generate your API key.

### 2. Connect the Agent

```bash
cloudmigrate-agent connect --api-key YOUR_API_KEY
```

Or set the environment variable:
```bash
export CLOUDMIGRATE_API_KEY=YOUR_API_KEY
cloudmigrate-agent connect
```

### 3. Scan a Directory

```bash
# Scan current directory
cloudmigrate-agent scan

# Scan specific directory
cloudmigrate-agent scan /path/to/your/project
```

### 4. Watch Mode (Continuous Sync)

Keep the agent running to enable real-time file queries from the AI:

```bash
cloudmigrate-agent watch /path/to/your/project
```

## Commands

| Command | Description |
|---------|-------------|
| `connect` | Authenticate with CloudMigrate |
| `scan [path]` | Scan directory and upload results |
| `watch [path]` | Watch directory for changes |
| `list [path]` | List files in directory |
| `status` | Check connection status |
| `version` | Print agent version |

## Flags

| Flag | Description |
|------|-------------|
| `--api-key` | API key for authentication |
| `--server` | CloudMigrate server URL (default: https://cloudmigrate.io) |

## What Data is Collected?

The agent collects:
- File names and paths (relative to scanned directory)
- File sizes and modification times
- File type distribution (extensions)
- Directory structure

The agent does **NOT**:
- Read file contents (except when explicitly requested for small text files)
- Upload any files to the cloud
- Access files outside the specified directory
- Run in the background without your knowledge

## Security

- All communication is encrypted (HTTPS/WSS)
- API keys can be revoked at any time
- Agent only accesses directories you explicitly specify
- No data is stored permanently on CloudMigrate servers

## Building from Source

```bash
# Clone the repo
git clone https://github.com/cloudmigrate/agent
cd agent

# Build
make build

# Or build for all platforms
make build-all
```

## License

MIT License - see LICENSE file for details.
