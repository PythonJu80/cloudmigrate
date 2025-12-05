package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/cloudmigrate/agent/internal/api"
	"github.com/cloudmigrate/agent/internal/discovery"
	"github.com/cloudmigrate/agent/internal/scanner"
	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	version   = "1.0.0"
	serverURL = "https://cloudmigrate.io"
	apiKey    string
	watchPath string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "cloudmigrate-agent",
		Short: "CloudMigrate Agent - Local file scanner for cloud migration",
		Long: `CloudMigrate Agent scans your local files and reports to the CloudMigrate platform.
This enables the AI assistant to analyze your files and provide migration recommendations.`,
	}

	// Connect command - authenticate with the platform
	connectCmd := &cobra.Command{
		Use:   "connect",
		Short: "Connect agent to CloudMigrate platform",
		Run: func(cmd *cobra.Command, args []string) {
			if apiKey == "" {
				color.Red("Error: API key required. Use --api-key or set CLOUDMIGRATE_API_KEY")
				os.Exit(1)
			}

			client := api.NewClient(serverURL, apiKey)
			if err := client.Authenticate(); err != nil {
				color.Red("Authentication failed: %v", err)
				os.Exit(1)
			}

			color.Green("✓ Connected to CloudMigrate!")
			fmt.Println("Agent is ready. Use 'cloudmigrate-agent scan' to scan directories.")
		},
	}

	// Scan command - scan a directory
	scanCmd := &cobra.Command{
		Use:   "scan [path]",
		Short: "Scan a directory and report to CloudMigrate",
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			path := "."
			if len(args) > 0 {
				path = args[0]
			}

			if apiKey == "" {
				color.Red("Error: API key required. Use --api-key or set CLOUDMIGRATE_API_KEY")
				os.Exit(1)
			}

			color.Cyan("Scanning: %s", path)

			result, err := scanner.ScanDirectory(path)
			if err != nil {
				color.Red("Scan failed: %v", err)
				os.Exit(1)
			}

			// Print summary
			color.Green("\n✓ Scan complete!")
			fmt.Printf("  Files:   %d\n", result.FileCount)
			fmt.Printf("  Folders: %d\n", result.FolderCount)
			fmt.Printf("  Size:    %s\n", scanner.FormatBytes(result.TotalSize))

			// Upload to server
			client := api.NewClient(serverURL, apiKey)
			if err := client.UploadScanResult(result); err != nil {
				color.Red("Failed to upload results: %v", err)
				os.Exit(1)
			}

			color.Green("✓ Results uploaded to CloudMigrate!")
			fmt.Println("\nYour AI assistant can now analyze these files.")
			fmt.Println("Try asking: 'What files should I migrate first?'")
		},
	}

	// Watch command - continuously watch a directory
	watchCmd := &cobra.Command{
		Use:   "watch [path]",
		Short: "Watch a directory for changes and sync with CloudMigrate",
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			path := "."
			if len(args) > 0 {
				path = args[0]
			}

			if apiKey == "" {
				color.Red("Error: API key required")
				os.Exit(1)
			}

			color.Cyan("Watching: %s", path)
			color.Yellow("Press Ctrl+C to stop")

			client := api.NewClient(serverURL, apiKey)
			if err := client.WatchDirectory(path); err != nil {
				color.Red("Watch failed: %v", err)
				os.Exit(1)
			}
		},
	}

	// Daemon command - run in background, poll for commands from AI
	daemonCmd := &cobra.Command{
		Use:   "daemon [path]",
		Short: "Run agent in daemon mode, executing commands from AI assistant",
		Long: `Run the agent as a daemon that polls for commands from the CloudMigrate platform.
The AI assistant can send commands like SCAN, LIST, UPLOAD, DOWNLOAD which the agent executes.`,
		Args: cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			path := "."
			if len(args) > 0 {
				path = args[0]
			}

			if apiKey == "" {
				color.Red("Error: API key required. Use --api-key or set CLOUDMIGRATE_API_KEY")
				os.Exit(1)
			}

			client := api.NewClient(serverURL, apiKey)
			
			// Verify connection first
			if err := client.Authenticate(); err != nil {
				color.Red("Authentication failed: %v", err)
				os.Exit(1)
			}

			// Run daemon with 5 second poll interval
			if err := client.RunDaemon(path, 5*time.Second); err != nil {
				color.Red("Daemon error: %v", err)
				os.Exit(1)
			}
		},
	}

	// List command - list files (for AI agent queries)
	listCmd := &cobra.Command{
		Use:   "list [path]",
		Short: "List files in a directory",
		Args:  cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			path := "."
			if len(args) > 0 {
				path = args[0]
			}

			files, err := scanner.ListFiles(path, 50)
			if err != nil {
				color.Red("Error: %v", err)
				os.Exit(1)
			}

			for _, f := range files {
				if f.IsDir {
					color.Blue("📁 %s/", f.Name)
				} else {
					fmt.Printf("   %s (%s)\n", f.Name, scanner.FormatBytes(f.Size))
				}
			}
		},
	}

	// Status command
	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Check agent connection status",
		Run: func(cmd *cobra.Command, args []string) {
			if apiKey == "" {
				color.Yellow("Not connected. Use 'cloudmigrate-agent connect --api-key YOUR_KEY'")
				return
			}

			client := api.NewClient(serverURL, apiKey)
			status, err := client.GetStatus()
			if err != nil {
				color.Red("Error: %v", err)
				os.Exit(1)
			}

			color.Green("✓ Connected")
			fmt.Printf("  Tenant: %s\n", status.TenantName)
			fmt.Printf("  Plan:   %s\n", status.Plan)
			if status.LastScan != "" {
				fmt.Printf("  Last Scan: %s\n", status.LastScan)
			}
		},
	}

	// Version command
	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print agent version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("CloudMigrate Agent v%s\n", version)
		},
	}

	// Discover command - scan network for infrastructure
	discoverCmd := &cobra.Command{
		Use:   "discover [network]",
		Short: "Discover infrastructure on your network",
		Long: `Scan your network to discover servers, databases, applications, and other infrastructure.
		
Examples:
  cloudmigrate-agent discover                    # Auto-detect local networks
  cloudmigrate-agent discover 192.168.1.0/24    # Scan specific subnet
  cloudmigrate-agent discover 10.0.0.1-254      # Scan IP range`,
		Args: cobra.MaximumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			deepScan, _ := cmd.Flags().GetBool("deep")
			timeout, _ := cmd.Flags().GetInt("timeout")

			var networks []string
			if len(args) > 0 {
				networks = []string{args[0]}
			} else {
				// Auto-detect local networks
				var err error
				networks, err = discovery.GetLocalNetworks()
				if err != nil {
					color.Red("Failed to detect networks: %v", err)
					os.Exit(1)
				}
				if len(networks) == 0 {
					color.Red("No networks found")
					os.Exit(1)
				}
			}

			color.Cyan("🔍 CloudMigrate Infrastructure Discovery")
			color.Cyan("=========================================\n")

			opts := discovery.DefaultScanOptions()
			opts.DeepScan = deepScan
			opts.Timeout = time.Duration(timeout) * time.Millisecond

			scanner := discovery.NewScanner(opts)
			ctx := context.Background()

			for _, network := range networks {
				color.Yellow("Scanning network: %s", network)
				
				result, err := scanner.ScanNetwork(ctx, network)
				if err != nil {
					color.Red("Scan failed: %v", err)
					continue
				}

				// Print results
				fmt.Println()
				color.Green("✓ Scan complete!")
				fmt.Printf("  Duration:     %s\n", result.CompletedAt.Sub(result.StartedAt).Round(time.Millisecond))
				fmt.Printf("  Hosts found:  %d online\n", result.Summary.OnlineHosts)
				fmt.Println()

				// Print by category
				if len(result.Summary.ByCategory) > 0 {
					color.Cyan("By Category:")
					for cat, count := range result.Summary.ByCategory {
						fmt.Printf("  %-12s %d\n", cat+":", count)
					}
					fmt.Println()
				}

				// Print discovered hosts
				if len(result.Hosts) > 0 {
					color.Cyan("Discovered Hosts:")
					for _, host := range result.Hosts {
						statusIcon := "🟢"
						if host.Status != "online" {
							statusIcon = "🔴"
						}
						
						hostname := host.Hostname
						if hostname == "" {
							hostname = "(no hostname)"
						}

						fmt.Printf("  %s %-15s  %-20s  %-10s", statusIcon, host.IP, hostname, host.OS)
						
						if len(host.Services) > 0 {
							var svcNames []string
							for _, svc := range host.Services {
								svcNames = append(svcNames, svc.Name)
							}
							fmt.Printf("  [%s]", joinMax(svcNames, 3))
						}
						
						if host.AWSTarget != "" {
							color.Green(" → %s", host.AWSTarget)
						} else {
							fmt.Println()
						}
					}
				}

				// Upload to server if API key provided
				if apiKey != "" {
					client := api.NewClient(serverURL, apiKey)
					if err := client.UploadDiscoveryResult(result); err != nil {
						color.Yellow("Warning: Failed to upload results: %v", err)
					} else {
						color.Green("\n✓ Results uploaded to CloudMigrate!")
					}
				}
			}
		},
	}
	discoverCmd.Flags().Bool("deep", false, "Perform deep scan with banner grabbing")
	discoverCmd.Flags().Int("timeout", 2000, "Port scan timeout in milliseconds")

	// Global flags
	rootCmd.PersistentFlags().StringVar(&apiKey, "api-key", os.Getenv("CLOUDMIGRATE_API_KEY"), "API key for authentication")
	rootCmd.PersistentFlags().StringVar(&serverURL, "server", serverURL, "CloudMigrate server URL")

	// Add commands
	rootCmd.AddCommand(connectCmd, scanCmd, watchCmd, daemonCmd, listCmd, statusCmd, versionCmd, discoverCmd)

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

// joinMax joins strings with comma, limiting to max items
func joinMax(items []string, max int) string {
	if len(items) <= max {
		return strings.Join(items, ", ")
	}
	return strings.Join(items[:max], ", ") + fmt.Sprintf(" +%d more", len(items)-max)
}
