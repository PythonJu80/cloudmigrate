.PHONY: build build-all clean test

VERSION := 1.0.0
BINARY := cloudmigrate-agent
BUILD_DIR := dist

# Build for current platform
build:
	go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY) ./cmd

# Build for all platforms
build-all: clean
	@mkdir -p $(BUILD_DIR)
	
	@echo "Building for Linux (amd64)..."
	GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY)-linux-amd64 ./cmd
	
	@echo "Building for Linux (arm64)..."
	GOOS=linux GOARCH=arm64 go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY)-linux-arm64 ./cmd
	
	@echo "Building for macOS (amd64)..."
	GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY)-darwin-amd64 ./cmd
	
	@echo "Building for macOS (arm64/M1)..."
	GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY)-darwin-arm64 ./cmd
	
	@echo "Building for Windows (amd64)..."
	GOOS=windows GOARCH=amd64 go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY)-windows-amd64.exe ./cmd
	
	@echo "Done! Binaries in $(BUILD_DIR)/"
	@ls -lh $(BUILD_DIR)/

clean:
	rm -rf $(BUILD_DIR)

test:
	go test -v ./...

# Install dependencies
deps:
	go mod download
	go mod tidy
