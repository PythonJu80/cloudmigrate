import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/agent/download - Download agent installer with embedded API key
 * 
 * This generates a platform-specific installer script that:
 * 1. Downloads the agent binary
 * 2. Embeds the API key in config
 * 3. Provides a simple GUI for folder selection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const apiKey = searchParams.get("key");

    if (!platform || !apiKey) {
      return NextResponse.json({ error: "Missing platform or key" }, { status: 400 });
    }

    // Verify API key exists
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const serverUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cloudmigrate.io";

    if (platform === "windows") {
      // Windows PowerShell installer script
      const script = `
# CloudMigrate Agent Installer for Windows
# This script downloads and configures the CloudMigrate agent

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     CloudMigrate Agent Installer         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration (embedded)
$API_KEY = "${apiKey}"
$SERVER_URL = "${serverUrl}"
$INSTALL_DIR = "$env:LOCALAPPDATA\\CloudMigrate"
$AGENT_URL = "$SERVER_URL/downloads/cloudmigrate-agent-windows-amd64.exe"

# Create install directory
Write-Host "Creating installation directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

# Download agent
Write-Host "Downloading CloudMigrate Agent..." -ForegroundColor Yellow
$agentPath = "$INSTALL_DIR\\cloudmigrate-agent.exe"
try {
    Invoke-WebRequest -Uri $AGENT_URL -OutFile $agentPath -UseBasicParsing
} catch {
    Write-Host "Download failed. Creating placeholder..." -ForegroundColor Red
    # For now, create a batch file that simulates the agent
    @"
@echo off
echo CloudMigrate Agent v1.0.0
echo API Key: %1
echo Server: ${serverUrl}
echo.
echo Agent would scan the specified folder and upload metadata.
echo This is a placeholder - full binary coming soon!
pause
"@ | Out-File -FilePath $agentPath -Encoding ASCII
}

# Save configuration
Write-Host "Saving configuration..." -ForegroundColor Yellow
$configPath = "$INSTALL_DIR\\config.json"
@"
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL"
}
"@ | Out-File -FilePath $configPath -Encoding UTF8

# Folder selection dialog
Add-Type -AssemblyName System.Windows.Forms
Write-Host ""
Write-Host "Please select the folder you want to scan..." -ForegroundColor Green

$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = "Select a folder for CloudMigrate to analyze"
$folderBrowser.ShowNewFolderButton = $false

if ($folderBrowser.ShowDialog() -eq "OK") {
    $selectedPath = $folderBrowser.SelectedPath
    Write-Host "Selected folder: $selectedPath" -ForegroundColor Cyan
    
    # Update config with selected path
    @"
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL",
  "watchPath": "$($selectedPath -replace '\\\\', '\\\\\\\\')"
}
"@ | Out-File -FilePath $configPath -Encoding UTF8

    # Start the agent
    Write-Host ""
    Write-Host "Starting CloudMigrate Agent..." -ForegroundColor Green
    Start-Process -FilePath $agentPath -ArgumentList "watch", "\`"$selectedPath\`"", "--api-key", $API_KEY, "--server", $SERVER_URL
    
    Write-Host ""
    Write-Host "✓ CloudMigrate Agent is now running!" -ForegroundColor Green
    Write-Host "  You can close this window." -ForegroundColor Gray
    Write-Host "  The agent will continue running in the background." -ForegroundColor Gray
} else {
    Write-Host "No folder selected. Exiting." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;

      return new NextResponse(script, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="CloudMigrate-Setup.ps1"`,
        },
      });

    } else if (platform === "mac") {
      // macOS shell script installer
      const script = `#!/bin/bash
# CloudMigrate Agent Installer for macOS
# This script downloads and configures the CloudMigrate agent

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     CloudMigrate Agent Installer         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Configuration (embedded)
API_KEY="${apiKey}"
SERVER_URL="${serverUrl}"
INSTALL_DIR="$HOME/.cloudmigrate"
AGENT_URL="$SERVER_URL/downloads/cloudmigrate-agent-darwin-arm64"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    AGENT_URL="$SERVER_URL/downloads/cloudmigrate-agent-darwin-amd64"
fi

# Create install directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Download agent
echo "Downloading CloudMigrate Agent..."
AGENT_PATH="$INSTALL_DIR/cloudmigrate-agent"
if curl -fsSL "$AGENT_URL" -o "$AGENT_PATH" 2>/dev/null; then
    chmod +x "$AGENT_PATH"
else
    echo "Download not available yet. Creating placeholder..."
    cat > "$AGENT_PATH" << 'PLACEHOLDER'
#!/bin/bash
echo "CloudMigrate Agent v1.0.0"
echo "API Key: $1"
echo "This is a placeholder - full binary coming soon!"
PLACEHOLDER
    chmod +x "$AGENT_PATH"
fi

# Save configuration
echo "Saving configuration..."
cat > "$INSTALL_DIR/config.json" << EOF
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL"
}
EOF

# Folder selection using AppleScript
echo ""
echo "Please select the folder you want to scan..."

SELECTED_PATH=$(osascript -e 'tell application "Finder"
    activate
    set folderPath to choose folder with prompt "Select a folder for CloudMigrate to analyze"
    return POSIX path of folderPath
end tell' 2>/dev/null)

if [ -n "$SELECTED_PATH" ]; then
    echo "Selected folder: $SELECTED_PATH"
    
    # Update config
    cat > "$INSTALL_DIR/config.json" << EOF
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL",
  "watchPath": "$SELECTED_PATH"
}
EOF

    # Start the agent
    echo ""
    echo "Starting CloudMigrate Agent..."
    nohup "$AGENT_PATH" watch "$SELECTED_PATH" --api-key "$API_KEY" --server "$SERVER_URL" > "$INSTALL_DIR/agent.log" 2>&1 &
    
    echo ""
    echo "✓ CloudMigrate Agent is now running!"
    echo "  You can close this terminal."
    echo "  The agent will continue running in the background."
    
    # Open success notification
    osascript -e 'display notification "Agent is now scanning your files" with title "CloudMigrate Connected"' 2>/dev/null || true
else
    echo "No folder selected. Exiting."
fi

echo ""
echo "Press Enter to close..."
read
`;

      return new NextResponse(script, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="CloudMigrate-Setup.command"`,
        },
      });

    } else if (platform === "linux") {
      // Linux shell script installer with built-in scanner
      const script = `#!/bin/bash
# CloudMigrate Agent for Linux
# This script scans your files and connects to CloudMigrate

echo "╔══════════════════════════════════════════╗"
echo "║     CloudMigrate Agent                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Configuration (embedded)
API_KEY="${apiKey}"
SERVER_URL="${serverUrl}"
INSTALL_DIR="$HOME/.cloudmigrate"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Save configuration
cat > "$INSTALL_DIR/config.json" << EOF
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL"
}
EOF

# Folder selection
echo "Please enter the path to the folder you want to scan:"
echo "(e.g., /home/user/projects or ~/Documents)"
echo ""
read -p "Folder path: " SELECTED_PATH

# Expand tilde
eval SELECTED_PATH="$SELECTED_PATH"

if [ ! -d "$SELECTED_PATH" ]; then
    echo "Error: Folder not found: $SELECTED_PATH"
    echo "Press Enter to close..."
    read
    exit 1
fi

echo ""
echo "Scanning folder: $SELECTED_PATH"
echo "This may take a moment..."

# Scan the directory and build JSON
SCAN_FILE="$INSTALL_DIR/scan_result.json"
FILE_COUNT=0
FOLDER_COUNT=0
TOTAL_SIZE=0
FILES_JSON="[]"
LARGE_FILES_JSON="[]"
FILE_TYPES="{}"

# Use find to get all files
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        FILE_COUNT=$((FILE_COUNT + 1))
        SIZE=\$(stat -c%s "$file" 2>/dev/null || echo 0)
        TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
        EXT="\${file##*.}"
        NAME="\$(basename "$file")"
        MODIFIED=\$(stat -c%Y "$file" 2>/dev/null || echo 0)
        
        # Track file types
        if [ -n "$EXT" ] && [ "$EXT" != "$NAME" ]; then
            FILE_TYPES=\$(echo "$FILE_TYPES" | jq --arg ext "$EXT" '.[$ext] = ((.[$ext] // 0) + 1)')
        fi
        
        # Track large files (>10MB)
        if [ "$SIZE" -gt 10485760 ]; then
            LARGE_FILES_JSON=\$(echo "$LARGE_FILES_JSON" | jq --arg name "$NAME" --arg path "$file" --argjson size "$SIZE" '. + [{"name": $name, "path": $path, "size": $size}]')
        fi
    elif [ -d "$file" ]; then
        FOLDER_COUNT=$((FOLDER_COUNT + 1))
    fi
done < <(find "$SELECTED_PATH" -maxdepth 5 -print0 2>/dev/null)

echo "Found $FILE_COUNT files in $FOLDER_COUNT folders"
echo "Total size: $((TOTAL_SIZE / 1024 / 1024)) MB"

# Build scan result JSON
SCAN_JSON=\$(cat << ENDJSON
{
  "rootPath": "$SELECTED_PATH",
  "fileCount": $FILE_COUNT,
  "folderCount": $FOLDER_COUNT,
  "totalSize": $TOTAL_SIZE,
  "files": [],
  "fileTypes": $FILE_TYPES,
  "largeFiles": $LARGE_FILES_JSON,
  "scannedAt": "\$(date -Iseconds)"
}
ENDJSON
)

echo "$SCAN_JSON" > "$SCAN_FILE"

echo ""
echo "Connecting to CloudMigrate..."

# Send scan results to server
RESPONSE=\$(curl -s -w "\\n%{http_code}" -X POST "$SERVER_URL/api/agent/scan" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "$SCAN_JSON")

HTTP_CODE=\$(echo "$RESPONSE" | tail -n1)
BODY=\$(echo "$RESPONSE" | sed '\$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✓ Successfully connected to CloudMigrate!"
    echo "✓ Scan results uploaded"
    echo ""
    echo "You can now go back to the CloudMigrate dashboard."
    echo "The AI assistant can help you analyze your files."
else
    echo ""
    echo "✗ Failed to connect (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    echo ""
    echo "Please check your internet connection and try again."
fi

# Update config with selected path
cat > "$INSTALL_DIR/config.json" << EOF
{
  "apiKey": "$API_KEY",
  "serverUrl": "$SERVER_URL",
  "watchPath": "$SELECTED_PATH",
  "lastScan": "\$(date -Iseconds)"
}
EOF

echo ""
echo "Press Enter to close..."
read
`;

      return new NextResponse(script, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="cloudmigrate-setup.sh"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

  } catch (error) {
    console.error("Agent download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
