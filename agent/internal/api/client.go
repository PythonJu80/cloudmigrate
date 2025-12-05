package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/cloudmigrate/agent/internal/discovery"
	"github.com/cloudmigrate/agent/internal/scanner"
	"github.com/fatih/color"
	"github.com/gorilla/websocket"
)

// Client handles communication with CloudMigrate server
type Client struct {
	serverURL  string
	apiKey     string
	httpClient *http.Client
}

// Status represents agent status from server
type Status struct {
	TenantName string `json:"tenantName"`
	Plan       string `json:"plan"`
	LastScan   string `json:"lastScan"`
	Connected  bool   `json:"connected"`
}

// Command represents a command from the server
type Command struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
	Status  string                 `json:"status"`
}

// CommandsResponse represents the response from /api/agent/commands
type CommandsResponse struct {
	Commands []Command `json:"commands"`
}

// NewClient creates a new API client
func NewClient(serverURL, apiKey string) *Client {
	return &Client{
		serverURL: serverURL,
		apiKey:    apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Authenticate verifies the API key with the server
func (c *Client) Authenticate() error {
	req, err := http.NewRequest("GET", c.serverURL+"/api/agent/auth", nil)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("authentication failed: %s", string(body))
	}

	return nil
}

// UploadScanResult sends scan results to the server
func (c *Client) UploadScanResult(result *scanner.ScanResult) error {
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", c.serverURL+"/api/agent/scan", bytes.NewReader(data))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed: %s", string(body))
	}

	return nil
}

// UploadDiscoveryResult sends infrastructure discovery results to the server
func (c *Client) UploadDiscoveryResult(result *discovery.DiscoveryResult) error {
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", c.serverURL+"/api/migrate/discover", bytes.NewReader(data))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed: %s", string(body))
	}

	return nil
}

// GetStatus gets agent status from server
func (c *Client) GetStatus() (*Status, error) {
	req, err := http.NewRequest("GET", c.serverURL+"/api/agent/status", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get status")
	}

	var status Status
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, err
	}

	return &status, nil
}

// GetCommands fetches pending commands from the server
func (c *Client) GetCommands() ([]Command, error) {
	req, err := http.NewRequest("GET", c.serverURL+"/api/agent/commands", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get commands")
	}

	var cmdResp CommandsResponse
	if err := json.NewDecoder(resp.Body).Decode(&cmdResp); err != nil {
		return nil, err
	}

	return cmdResp.Commands, nil
}

// UpdateCommandStatus updates a command's status on the server
func (c *Client) UpdateCommandStatus(cmdID, status string, result map[string]interface{}, errMsg string) error {
	payload := map[string]interface{}{
		"status": status,
	}
	if result != nil {
		payload["result"] = result
	}
	if errMsg != "" {
		payload["error"] = errMsg
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("PATCH", c.serverURL+"/api/agent/commands/"+cmdID, bytes.NewReader(data))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CloudMigrate-Agent/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to update command status")
	}

	return nil
}

// RunDaemon runs the agent in daemon mode, polling for commands
func (c *Client) RunDaemon(basePath string, pollInterval time.Duration) error {
	absPath, err := filepath.Abs(basePath)
	if err != nil {
		return err
	}

	color.Green("✓ Agent daemon started")
	color.Cyan("  Watching: %s", absPath)
	color.Cyan("  Polling every %s", pollInterval)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Initial scan
	result, err := scanner.ScanDirectory(absPath)
	if err != nil {
		return err
	}
	if err := c.UploadScanResult(result); err != nil {
		color.Yellow("Warning: Failed to upload initial scan: %v", err)
	} else {
		color.Green("✓ Initial scan uploaded (%d files)", result.FileCount)
	}

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-sigChan:
			color.Yellow("\nShutting down...")
			return nil
		case <-ticker.C:
			commands, err := c.GetCommands()
			if err != nil {
				color.Yellow("Warning: Failed to poll commands: %v", err)
				continue
			}

			for _, cmd := range commands {
				c.executeCommand(cmd, absPath)
			}
		}
	}
}

// executeCommand executes a single command
func (c *Client) executeCommand(cmd Command, basePath string) {
	color.Cyan("→ Executing command: %s (%s)", cmd.Type, cmd.ID[:8])

	// Mark as running
	c.UpdateCommandStatus(cmd.ID, "RUNNING", nil, "")

	var result map[string]interface{}
	var errMsg string

	switch cmd.Type {
	case "SCAN":
		path := basePath
		if p, ok := cmd.Payload["path"].(string); ok && p != "" {
			path = p
		}
		scanResult, err := scanner.ScanDirectory(path)
		if err != nil {
			errMsg = err.Error()
		} else {
			c.UploadScanResult(scanResult)
			result = map[string]interface{}{
				"fileCount":   scanResult.FileCount,
				"folderCount": scanResult.FolderCount,
				"totalSize":   scanResult.TotalSize,
			}
		}

	case "LIST":
		path := basePath
		if p, ok := cmd.Payload["path"].(string); ok && p != "" {
			path = p
		}
		limit := 100
		if l, ok := cmd.Payload["limit"].(float64); ok {
			limit = int(l)
		}
		files, err := scanner.ListFiles(path, limit)
		if err != nil {
			errMsg = err.Error()
		} else {
			result = map[string]interface{}{
				"files": files,
				"count": len(files),
			}
		}

	case "DISCOVER":
		// Infrastructure discovery scan
		networkCIDR := ""
		if cidr, ok := cmd.Payload["network"].(string); ok && cidr != "" {
			networkCIDR = cidr
		}
		
		opts := discovery.DefaultScanOptions()
		if deep, ok := cmd.Payload["deep"].(bool); ok {
			opts.DeepScan = deep
		}
		
		discScanner := discovery.NewScanner(opts)
		
		var networks []string
		if networkCIDR != "" {
			networks = []string{networkCIDR}
		} else {
			// Auto-detect local networks
			networks, err = discovery.GetLocalNetworks()
			if err != nil {
				errMsg = fmt.Sprintf("Failed to detect networks: %v", err)
				break
			}
		}
		
		// Scan each network
		for _, network := range networks {
			color.Yellow("  Scanning network: %s", network)
			discResult, err := discScanner.ScanNetwork(context.Background(), network)
			if err != nil {
				errMsg = fmt.Sprintf("Scan failed: %v", err)
				break
			}
			
			// Upload results
			if err := c.UploadDiscoveryResult(discResult); err != nil {
				errMsg = fmt.Sprintf("Failed to upload results: %v", err)
				break
			}
			
			result = map[string]interface{}{
				"scanId":      discResult.ScanID,
				"network":     network,
				"hostsFound":  discResult.Summary.OnlineHosts,
				"byCategory":  discResult.Summary.ByCategory,
			}
			color.Green("  ✓ Found %d hosts", discResult.Summary.OnlineHosts)
		}

	case "UPLOAD":
		// TODO: Implement S3 upload
		errMsg = "UPLOAD not yet implemented"

	case "DOWNLOAD":
		// TODO: Implement S3 download
		errMsg = "DOWNLOAD not yet implemented"

	default:
		errMsg = fmt.Sprintf("Unknown command type: %s", cmd.Type)
	}

	// Update status
	status := "COMPLETED"
	if errMsg != "" {
		status = "FAILED"
		color.Red("  ✗ Command failed: %s", errMsg)
	} else {
		color.Green("  ✓ Command completed")
	}

	c.UpdateCommandStatus(cmd.ID, status, result, errMsg)
}

// WatchDirectory watches a directory and syncs changes via WebSocket
func (c *Client) WatchDirectory(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	// Connect via WebSocket
	wsURL := "ws" + c.serverURL[4:] + "/api/agent/ws"
	header := http.Header{}
	header.Set("Authorization", "Bearer "+c.apiKey)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		return fmt.Errorf("websocket connection failed: %w", err)
	}
	defer conn.Close()

	color.Green("✓ Connected to CloudMigrate")

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Initial scan
	result, err := scanner.ScanDirectory(absPath)
	if err != nil {
		return err
	}

	// Send initial scan
	if err := conn.WriteJSON(map[string]interface{}{
		"type": "scan",
		"data": result,
	}); err != nil {
		return err
	}

	color.Green("✓ Initial scan uploaded (%d files)", result.FileCount)

	// Listen for commands from server
	go func() {
		for {
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				return
			}

			switch msg["type"] {
			case "list":
				// Server requesting file list
				path := msg["path"].(string)
				files, err := scanner.ListFiles(path, 100)
				if err != nil {
					conn.WriteJSON(map[string]interface{}{
						"type":  "error",
						"error": err.Error(),
					})
					continue
				}
				conn.WriteJSON(map[string]interface{}{
					"type":  "files",
					"files": files,
				})

			case "read":
				// Server requesting file content (for small files)
				filePath := msg["path"].(string)
				info, err := os.Stat(filePath)
				if err != nil || info.Size() > 1024*1024 { // Max 1MB
					conn.WriteJSON(map[string]interface{}{
						"type":  "error",
						"error": "file too large or not found",
					})
					continue
				}
				content, err := os.ReadFile(filePath)
				if err != nil {
					conn.WriteJSON(map[string]interface{}{
						"type":  "error",
						"error": err.Error(),
					})
					continue
				}
				conn.WriteJSON(map[string]interface{}{
					"type":    "content",
					"path":    filePath,
					"content": string(content),
				})

			case "rescan":
				// Server requesting rescan
				result, err := scanner.ScanDirectory(absPath)
				if err != nil {
					conn.WriteJSON(map[string]interface{}{
						"type":  "error",
						"error": err.Error(),
					})
					continue
				}
				conn.WriteJSON(map[string]interface{}{
					"type": "scan",
					"data": result,
				})
				color.Cyan("↻ Rescan completed")
			}
		}
	}()

	// Keep alive
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-sigChan:
			color.Yellow("\nShutting down...")
			conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			return nil
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return fmt.Errorf("connection lost: %w", err)
			}
		}
	}
}
