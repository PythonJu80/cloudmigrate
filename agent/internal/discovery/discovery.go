package discovery

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// DiscoveryResult contains all discovered infrastructure
type DiscoveryResult struct {
	ScanID      string           `json:"scanId"`
	NetworkCIDR string           `json:"networkCidr"`
	StartedAt   time.Time        `json:"startedAt"`
	CompletedAt time.Time        `json:"completedAt"`
	Hosts       []DiscoveredHost `json:"hosts"`
	Summary     DiscoverySummary `json:"summary"`
}

// DiscoverySummary provides counts by category
type DiscoverySummary struct {
	TotalHosts   int            `json:"totalHosts"`
	OnlineHosts  int            `json:"onlineHosts"`
	ByCategory   map[string]int `json:"byCategory"`
	ByOS         map[string]int `json:"byOs"`
}

// DiscoveredHost represents a discovered network host
type DiscoveredHost struct {
	IP           string            `json:"ip"`
	Hostname     string            `json:"hostname"`
	MAC          string            `json:"mac,omitempty"`
	Status       string            `json:"status"` // online, offline
	OS           string            `json:"os,omitempty"`
	OSVersion    string            `json:"osVersion,omitempty"`
	OpenPorts    []PortInfo        `json:"openPorts"`
	Services     []ServiceInfo     `json:"services"`
	Category     string            `json:"category"` // compute, database, storage, etc.
	AWSTarget    string            `json:"awsTarget,omitempty"`
	ResponseTime int64             `json:"responseTimeMs"`
	LastSeen     time.Time         `json:"lastSeen"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// PortInfo represents an open port
type PortInfo struct {
	Port     int    `json:"port"`
	Protocol string `json:"protocol"` // tcp, udp
	State    string `json:"state"`    // open, closed, filtered
	Service  string `json:"service,omitempty"`
	Banner   string `json:"banner,omitempty"`
}

// ServiceInfo represents a detected service
type ServiceInfo struct {
	Name        string `json:"name"`
	Type        string `json:"type"` // database, web, mail, etc.
	Version     string `json:"version,omitempty"`
	Port        int    `json:"port"`
	Product     string `json:"product,omitempty"`
	AWSTarget   string `json:"awsTarget"`
	Confidence  int    `json:"confidence"` // 0-100
}

// Common ports to scan
var commonPorts = []int{
	// Web
	80, 443, 8080, 8443, 8000, 3000, 5000,
	// Databases
	3306, 5432, 1433, 1521, 27017, 6379, 11211, 9042,
	// SSH/Remote
	22, 23, 3389, 5900,
	// Mail
	25, 110, 143, 465, 587, 993, 995,
	// File sharing
	21, 445, 139, 2049,
	// Message queues
	5672, 61616, 9092,
	// Monitoring
	161, 162, 9090, 9100, 3000,
	// LDAP/AD
	389, 636, 88, 464,
	// DNS
	53,
	// Other
	8081, 9000, 9200, 9300,
}

// ServiceSignatures maps ports to services - THE 12 CATEGORIES THAT MATTER
var serviceSignatures = map[int]ServiceInfo{
	// 1. COMPUTE - VMs, physical servers
	22:   {Name: "SSH", Type: "compute", AWSTarget: "EC2"},
	3389: {Name: "RDP", Type: "compute", AWSTarget: "EC2 Windows"},
	5900: {Name: "VNC", Type: "compute", AWSTarget: "EC2"},

	// 2. DATABASES - SQL Server, Oracle, MySQL, PostgreSQL
	3306:  {Name: "MySQL", Type: "databases", AWSTarget: "RDS MySQL"},
	5432:  {Name: "PostgreSQL", Type: "databases", AWSTarget: "RDS PostgreSQL"},
	1433:  {Name: "SQL Server", Type: "databases", AWSTarget: "RDS SQL Server"},
	1521:  {Name: "Oracle", Type: "databases", AWSTarget: "RDS Oracle"},
	27017: {Name: "MongoDB", Type: "databases", AWSTarget: "DocumentDB"},
	6379:  {Name: "Redis", Type: "databases", AWSTarget: "ElastiCache"},

	// 3. FILE STORAGE - SMB shares, NAS, file servers
	445:  {Name: "SMB", Type: "storage", AWSTarget: "FSx"},
	139:  {Name: "NetBIOS", Type: "storage", AWSTarget: "FSx"},
	2049: {Name: "NFS", Type: "storage", AWSTarget: "EFS"},
	21:   {Name: "FTP", Type: "storage", AWSTarget: "S3/Transfer Family"},

	// 4. IDENTITY - Active Directory, LDAP
	389: {Name: "LDAP", Type: "identity", AWSTarget: "Managed AD"},
	636: {Name: "LDAPS", Type: "identity", AWSTarget: "Managed AD"},
	88:  {Name: "Kerberos", Type: "identity", AWSTarget: "Managed AD"},
	464: {Name: "Kerberos Password", Type: "identity", AWSTarget: "Managed AD"},

	// 5. NETWORKS & VPN - Firewalls, routers, VPN
	500:  {Name: "IKE/IPSec", Type: "networking", AWSTarget: "VPN"},
	4500: {Name: "IPSec NAT-T", Type: "networking", AWSTarget: "VPN"},
	1194: {Name: "OpenVPN", Type: "networking", AWSTarget: "VPN"},

	// 6. WEB APPS - IIS, Apache, Nginx
	80:   {Name: "HTTP", Type: "webapps", AWSTarget: "EC2/ECS/ALB"},
	443:  {Name: "HTTPS", Type: "webapps", AWSTarget: "EC2/ECS/CloudFront"},
	8080: {Name: "HTTP Alt", Type: "webapps", AWSTarget: "EC2/ECS"},
	8443: {Name: "HTTPS Alt", Type: "webapps", AWSTarget: "EC2/ECS"},

	// 7. BACKUPS / DR - Veeam, tapes, SAN snapshots
	9392:  {Name: "Veeam", Type: "backups", AWSTarget: "AWS Backup"},
	10006: {Name: "Veeam Data Mover", Type: "backups", AWSTarget: "S3 Glacier"},

	// 8. LOGGING / MONITORING - Nagios, Zabbix, ELK, Splunk
	9090: {Name: "Prometheus", Type: "monitoring", AWSTarget: "Managed Prometheus"},
	9100: {Name: "Node Exporter", Type: "monitoring", AWSTarget: "CloudWatch"},
	9200: {Name: "Elasticsearch", Type: "monitoring", AWSTarget: "OpenSearch"},
	5601: {Name: "Kibana", Type: "monitoring", AWSTarget: "OpenSearch"},
	514:  {Name: "Syslog", Type: "monitoring", AWSTarget: "CloudWatch"},

	// 9. DEVOPS PIPELINES - Jenkins, GitLab, Bitbucket
	8929: {Name: "GitLab", Type: "devops", AWSTarget: "CodePipeline"},
	7990: {Name: "Bitbucket", Type: "devops", AWSTarget: "CodeCommit"},
	// Note: Jenkins often on 8080, detected as web but can be refined

	// 10. MESSAGING & QUEUES - RabbitMQ, Kafka, ActiveMQ
	5672:  {Name: "RabbitMQ", Type: "messaging", AWSTarget: "SQS/MQ"},
	9092:  {Name: "Kafka", Type: "messaging", AWSTarget: "MSK"},
	61616: {Name: "ActiveMQ", Type: "messaging", AWSTarget: "MQ"},

	// 11. EMAIL / SMTP - Exchange, SMTP relays
	25:  {Name: "SMTP", Type: "email", AWSTarget: "SES"},
	587: {Name: "SMTP Submission", Type: "email", AWSTarget: "SES"},
	993: {Name: "IMAPS", Type: "email", AWSTarget: "WorkMail"},
	995: {Name: "POP3S", Type: "email", AWSTarget: "WorkMail"},

	// 12. BATCH JOBS / CRON - detected via SSH + process inspection
	// No specific ports - these are identified by analyzing running processes
}

// ScanOptions configures the discovery scan
type ScanOptions struct {
	NetworkCIDR    string
	Ports          []int
	Timeout        time.Duration
	Concurrency    int
	DeepScan       bool // Do banner grabbing
	IncludeOffline bool
}

// DefaultScanOptions returns sensible defaults
func DefaultScanOptions() ScanOptions {
	return ScanOptions{
		Ports:       commonPorts,
		Timeout:     2 * time.Second,
		Concurrency: 50,
		DeepScan:    false,
	}
}

// Scanner performs infrastructure discovery
type Scanner struct {
	options ScanOptions
}

// NewScanner creates a new discovery scanner
func NewScanner(options ScanOptions) *Scanner {
	if options.Concurrency == 0 {
		options.Concurrency = 50
	}
	if options.Timeout == 0 {
		options.Timeout = 2 * time.Second
	}
	if len(options.Ports) == 0 {
		options.Ports = commonPorts
	}
	return &Scanner{options: options}
}

// ScanNetwork discovers hosts on the network
func (s *Scanner) ScanNetwork(ctx context.Context, cidr string) (*DiscoveryResult, error) {
	result := &DiscoveryResult{
		ScanID:      fmt.Sprintf("scan-%d", time.Now().UnixNano()),
		NetworkCIDR: cidr,
		StartedAt:   time.Now(),
		Hosts:       []DiscoveredHost{},
		Summary: DiscoverySummary{
			ByCategory: make(map[string]int),
			ByOS:       make(map[string]int),
		},
	}

	// Parse CIDR
	ips, err := expandCIDR(cidr)
	if err != nil {
		return nil, fmt.Errorf("invalid CIDR: %w", err)
	}

	// Scan hosts concurrently
	var wg sync.WaitGroup
	hostChan := make(chan DiscoveredHost, len(ips))
	semaphore := make(chan struct{}, s.options.Concurrency)

	for _, ip := range ips {
		wg.Add(1)
		go func(ipAddr string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			select {
			case <-ctx.Done():
				return
			default:
				if host := s.scanHost(ctx, ipAddr); host != nil {
					hostChan <- *host
				}
			}
		}(ip)
	}

	// Wait and close channel
	go func() {
		wg.Wait()
		close(hostChan)
	}()

	// Collect results
	for host := range hostChan {
		result.Hosts = append(result.Hosts, host)
		result.Summary.TotalHosts++
		if host.Status == "online" {
			result.Summary.OnlineHosts++
		}
		if host.Category != "" {
			result.Summary.ByCategory[host.Category]++
		}
		if host.OS != "" {
			result.Summary.ByOS[host.OS]++
		}
	}

	result.CompletedAt = time.Now()
	return result, nil
}

// scanHost scans a single host
func (s *Scanner) scanHost(ctx context.Context, ip string) *DiscoveredHost {
	host := &DiscoveredHost{
		IP:        ip,
		Status:    "offline",
		OpenPorts: []PortInfo{},
		Services:  []ServiceInfo{},
		Metadata:  make(map[string]string),
		LastSeen:  time.Now(),
	}

	// Quick ping check
	start := time.Now()
	if !s.isHostAlive(ip) {
		if !s.options.IncludeOffline {
			return nil
		}
		return host
	}
	host.ResponseTime = time.Since(start).Milliseconds()
	host.Status = "online"

	// Resolve hostname
	if names, err := net.LookupAddr(ip); err == nil && len(names) > 0 {
		host.Hostname = strings.TrimSuffix(names[0], ".")
	}

	// Port scan
	var wg sync.WaitGroup
	portChan := make(chan PortInfo, len(s.options.Ports))

	for _, port := range s.options.Ports {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			if portInfo := s.scanPort(ip, p); portInfo != nil {
				portChan <- *portInfo
			}
		}(port)
	}

	go func() {
		wg.Wait()
		close(portChan)
	}()

	for portInfo := range portChan {
		host.OpenPorts = append(host.OpenPorts, portInfo)
		
		// Map to service
		if sig, ok := serviceSignatures[portInfo.Port]; ok {
			service := sig
			service.Port = portInfo.Port
			service.Confidence = 80
			
			// Try to get version from banner
			if s.options.DeepScan && portInfo.Banner != "" {
				service.Version = extractVersion(portInfo.Banner)
				service.Confidence = 95
			}
			
			host.Services = append(host.Services, service)
		}
	}

	// Determine primary category and AWS target
	host.Category, host.AWSTarget = s.categorizeHost(host)
	
	// Try to detect OS
	host.OS = s.detectOS(host)

	return host
}

// isHostAlive checks if a host responds to ping or TCP connect
func (s *Scanner) isHostAlive(ip string) bool {
	// Try TCP connect to common ports first (faster than ping)
	quickPorts := []int{22, 80, 443, 3389, 445}
	for _, port := range quickPorts {
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", ip, port), 500*time.Millisecond)
		if err == nil {
			conn.Close()
			return true
		}
	}

	// Fall back to ping
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "1000", ip)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", ip)
	}
	
	return cmd.Run() == nil
}

// scanPort checks if a port is open
func (s *Scanner) scanPort(ip string, port int) *PortInfo {
	address := fmt.Sprintf("%s:%d", ip, port)
	conn, err := net.DialTimeout("tcp", address, s.options.Timeout)
	if err != nil {
		return nil
	}
	defer conn.Close()

	portInfo := &PortInfo{
		Port:     port,
		Protocol: "tcp",
		State:    "open",
	}

	// Get service name
	if sig, ok := serviceSignatures[port]; ok {
		portInfo.Service = sig.Name
	}

	// Banner grab if deep scan
	if s.options.DeepScan {
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		buf := make([]byte, 1024)
		if n, err := conn.Read(buf); err == nil && n > 0 {
			portInfo.Banner = strings.TrimSpace(string(buf[:n]))
		}
	}

	return portInfo
}

// categorizeHost determines the primary category based on services
// Uses THE 12 CATEGORIES THAT MATTER
func (s *Scanner) categorizeHost(host *DiscoveredHost) (string, string) {
	// Priority order - databases and identity are high value, compute is default
	priorities := []string{
		"databases",   // 2. Databases
		"identity",    // 4. Identity
		"email",       // 11. Email
		"messaging",   // 10. Messaging
		"storage",     // 3. File Storage
		"webapps",     // 6. Web Apps
		"monitoring",  // 8. Logging/Monitoring
		"devops",      // 9. DevOps
		"backups",     // 7. Backups/DR
		"networking",  // 5. Networks/VPN
		"compute",     // 1. Compute (default)
	}
	
	categoryCount := make(map[string]int)
	var primaryAWS string
	
	for _, svc := range host.Services {
		categoryCount[svc.Type]++
		if primaryAWS == "" {
			primaryAWS = svc.AWSTarget
		}
	}

	for _, cat := range priorities {
		if categoryCount[cat] > 0 {
			return cat, primaryAWS
		}
	}

	// Default based on open ports
	if len(host.OpenPorts) > 0 {
		return "compute", "EC2"
	}

	return "unknown", ""
}

// detectOS tries to determine the operating system
func (s *Scanner) detectOS(host *DiscoveredHost) string {
	// Check for Windows indicators
	for _, port := range host.OpenPorts {
		if port.Port == 3389 || port.Port == 445 || port.Port == 135 {
			return "Windows"
		}
	}

	// Check for Linux indicators
	for _, port := range host.OpenPorts {
		if port.Port == 22 {
			return "Linux"
		}
	}

	return "Unknown"
}

// expandCIDR converts CIDR notation to list of IPs
func expandCIDR(cidr string) ([]string, error) {
	// Handle single IP
	if !strings.Contains(cidr, "/") {
		return []string{cidr}, nil
	}

	// Handle IP range (e.g., 192.168.1.1-254)
	if strings.Contains(cidr, "-") {
		return expandRange(cidr)
	}

	ip, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		return nil, err
	}

	var ips []string
	for ip := ip.Mask(ipnet.Mask); ipnet.Contains(ip); incrementIP(ip) {
		ips = append(ips, ip.String())
	}

	// Remove network and broadcast addresses for /24 and smaller
	if len(ips) > 2 {
		ips = ips[1 : len(ips)-1]
	}

	return ips, nil
}

// expandRange expands IP range notation (e.g., 192.168.1.1-254)
func expandRange(rangeStr string) ([]string, error) {
	parts := strings.Split(rangeStr, "-")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid range format")
	}

	startIP := net.ParseIP(strings.TrimSpace(parts[0]))
	if startIP == nil {
		return nil, fmt.Errorf("invalid start IP")
	}

	endNum, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return nil, fmt.Errorf("invalid end number")
	}

	var ips []string
	ip4 := startIP.To4()
	startNum := int(ip4[3])

	for i := startNum; i <= endNum; i++ {
		newIP := make(net.IP, 4)
		copy(newIP, ip4)
		newIP[3] = byte(i)
		ips = append(ips, newIP.String())
	}

	return ips, nil
}

func incrementIP(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// extractVersion tries to extract version from banner
func extractVersion(banner string) string {
	// Common version patterns
	patterns := []string{
		`(\d+\.\d+\.\d+)`,
		`(\d+\.\d+)`,
		`version[:\s]+(\S+)`,
		`ver[:\s]+(\S+)`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(banner); len(matches) > 1 {
			return matches[1]
		}
	}

	return ""
}

// GetLocalNetworks returns the local network CIDRs
func GetLocalNetworks() ([]string, error) {
	var networks []string

	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok {
				if ip4 := ipnet.IP.To4(); ip4 != nil {
					// Skip link-local addresses
					if ip4[0] == 169 && ip4[1] == 254 {
						continue
					}
					ones, _ := ipnet.Mask.Size()
					networks = append(networks, fmt.Sprintf("%s/%d", ip4.String(), ones))
				}
			}
		}
	}

	return networks, nil
}
