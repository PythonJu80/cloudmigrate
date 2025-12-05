package scanner

import (
	"crypto/md5"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// FileInfo represents a single file
type FileInfo struct {
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Size     int64     `json:"size"`
	IsDir    bool      `json:"isDir"`
	Modified time.Time `json:"modified"`
	Hash     string    `json:"hash,omitempty"`
	Ext      string    `json:"ext"`
}

// ScanResult contains the results of a directory scan
type ScanResult struct {
	RootPath    string              `json:"rootPath"`
	FileCount   int                 `json:"fileCount"`
	FolderCount int                 `json:"folderCount"`
	TotalSize   int64               `json:"totalSize"`
	Files       []FileInfo          `json:"files"`
	FileTypes   map[string]int      `json:"fileTypes"`
	LargeFiles  []FileInfo          `json:"largeFiles"`
	ScannedAt   time.Time           `json:"scannedAt"`
}

// Patterns to ignore
var ignorePatterns = []string{
	".git",
	".svn",
	"node_modules",
	"__pycache__",
	".venv",
	"venv",
	".idea",
	".vscode",
	"vendor",
	"target",
	"build",
	"dist",
	".next",
	".nuxt",
}

// ScanDirectory scans a directory and returns file information
func ScanDirectory(root string) (*ScanResult, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}

	result := &ScanResult{
		RootPath:   absRoot,
		Files:      make([]FileInfo, 0),
		FileTypes:  make(map[string]int),
		LargeFiles: make([]FileInfo, 0),
		ScannedAt:  time.Now(),
	}

	err = filepath.Walk(absRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}

		// Check if should ignore
		name := info.Name()
		if strings.HasPrefix(name, ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		for _, pattern := range ignorePatterns {
			if name == pattern {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		relPath, _ := filepath.Rel(absRoot, path)

		if info.IsDir() {
			result.FolderCount++
		} else {
			result.FileCount++
			result.TotalSize += info.Size()

			ext := strings.ToLower(filepath.Ext(name))
			if ext == "" {
				ext = "(no ext)"
			}
			result.FileTypes[ext]++

			fileInfo := FileInfo{
				Name:     name,
				Path:     relPath,
				Size:     info.Size(),
				IsDir:    false,
				Modified: info.ModTime(),
				Ext:      ext,
			}

			// Track large files (> 10MB)
			if info.Size() > 10*1024*1024 {
				result.LargeFiles = append(result.LargeFiles, fileInfo)
			}

			// Only include first 1000 files in detail
			if len(result.Files) < 1000 {
				result.Files = append(result.Files, fileInfo)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort large files by size (descending)
	sortLargeFiles(result.LargeFiles)

	return result, nil
}

// ListFiles lists files in a directory (non-recursive)
func ListFiles(path string, limit int) ([]FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	files := make([]FileInfo, 0, limit)
	for i, entry := range entries {
		if i >= limit {
			break
		}

		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		files = append(files, FileInfo{
			Name:     entry.Name(),
			Path:     filepath.Join(path, entry.Name()),
			Size:     info.Size(),
			IsDir:    entry.IsDir(),
			Modified: info.ModTime(),
			Ext:      strings.ToLower(filepath.Ext(entry.Name())),
		})
	}

	return files, nil
}

// GetFileHash calculates MD5 hash of a file
func GetFileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// FormatBytes formats bytes to human readable string
func FormatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return string(rune(bytes)) + " B"
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return string(rune(bytes/div)) + " " + []string{"KB", "MB", "GB", "TB"}[exp]
}

func sortLargeFiles(files []FileInfo) {
	for i := 0; i < len(files)-1; i++ {
		for j := i + 1; j < len(files); j++ {
			if files[j].Size > files[i].Size {
				files[i], files[j] = files[j], files[i]
			}
		}
	}
}
