package proxy

import (
	"net"
	"testing"
)

func TestValidateTargetAddress(t *testing.T) {
	tests := []struct {
		name    string
		target  *TargetAddr
		wantErr bool
		errMsg  string
	}{
		// Test port validation
		{
			name:    "Invalid port 0",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 0},
			wantErr: true,
			errMsg:  "invalid port",
		},
		{
			name:    "Invalid port > 65535",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 65536},
			wantErr: true,
			errMsg:  "invalid port",
		},
		{
			name:    "Valid port",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 443},
			wantErr: false,
		},

		// Test IPv4 loopback/localhost
		{
			name:    "IPv4 localhost 127.0.0.1",
			target:  &TargetAddr{Host: "127.0.0.1", Port: 80},
			wantErr: true,
			errMsg:  "loopback",
		},
		{
			name:    "IPv4 localhost 127.1.1.1",
			target:  &TargetAddr{Host: "127.1.1.1", Port: 80},
			wantErr: true,
			errMsg:  "loopback",
		},

		// Test IPv4 private ranges
		{
			name:    "IPv4 private 10.x.x.x",
			target:  &TargetAddr{Host: "10.0.0.1", Port: 80},
			wantErr: true,
			errMsg:  "private IP",
		},
		{
			name:    "IPv4 private 172.16.x.x",
			target:  &TargetAddr{Host: "172.16.0.1", Port: 80},
			wantErr: true,
			errMsg:  "private IP",
		},
		{
			name:    "IPv4 private 172.31.x.x",
			target:  &TargetAddr{Host: "172.31.255.255", Port: 80},
			wantErr: true,
			errMsg:  "private IP",
		},
		{
			name:    "IPv4 private 192.168.x.x",
			target:  &TargetAddr{Host: "192.168.1.1", Port: 80},
			wantErr: true,
			errMsg:  "private IP",
		},
		{
			name:    "IPv4 not private (172.15.x.x)",
			target:  &TargetAddr{Host: "172.15.255.255", Port: 80},
			wantErr: false,
		},
		{
			name:    "IPv4 not private (172.32.x.x)",
			target:  &TargetAddr{Host: "172.32.0.1", Port: 80},
			wantErr: false,
		},

		// Test IPv4 link-local
		{
			name:    "IPv4 link-local 169.254.x.x",
			target:  &TargetAddr{Host: "169.254.1.1", Port: 80},
			wantErr: true,
			errMsg:  "link-local",
		},

		// Test IPv4 multicast
		{
			name:    "IPv4 multicast 224.x.x.x",
			target:  &TargetAddr{Host: "224.0.0.1", Port: 80},
			wantErr: true,
			errMsg:  "multicast",
		},
		{
			name:    "IPv4 multicast 239.x.x.x",
			target:  &TargetAddr{Host: "239.255.255.255", Port: 80},
			wantErr: true,
			errMsg:  "multicast",
		},

		// Test IPv4 reserved/invalid
		{
			name:    "IPv4 reserved 240.x.x.x",
			target:  &TargetAddr{Host: "240.0.0.1", Port: 80},
			wantErr: true,
			errMsg:  "reserved",
		},
		{
			name:    "IPv4 invalid 0.0.0.0",
			target:  &TargetAddr{Host: "0.0.0.0", Port: 80},
			wantErr: true,
			errMsg:  "invalid IP",
		},
		{
			name:    "IPv4 invalid 0.0.0.1",
			target:  &TargetAddr{Host: "0.0.0.1", Port: 80},
			wantErr: true,
			errMsg:  "invalid IP",
		},

		// Test IPv6 loopback
		{
			name:    "IPv6 loopback ::1",
			target:  &TargetAddr{Host: "[::1]", Port: 80},
			wantErr: true,
			errMsg:  "loopback",
		},
		{
			name:    "IPv6 loopback without brackets",
			target:  &TargetAddr{Host: "::1", Port: 80},
			wantErr: true,
			errMsg:  "loopback",
		},

		// Test IPv6 private (ULA)
		{
			name:    "IPv6 ULA fc00::",
			target:  &TargetAddr{Host: "[fc00::1]", Port: 80},
			wantErr: true,
			errMsg:  "private IPv6",
		},
		{
			name:    "IPv6 ULA fd00::",
			target:  &TargetAddr{Host: "[fd00::1]", Port: 80},
			wantErr: true,
			errMsg:  "private IPv6",
		},

		// Test IPv6 link-local
		{
			name:    "IPv6 link-local fe80::",
			target:  &TargetAddr{Host: "[fe80::1]", Port: 80},
			wantErr: true,
			errMsg:  "link-local IPv6",
		},
		{
			name:    "IPv6 link-local fe80::/10",
			target:  &TargetAddr{Host: "[fe80::1234:5678]", Port: 80},
			wantErr: true,
			errMsg:  "link-local IPv6",
		},

		// Test IPv6 multicast
		{
			name:    "IPv6 multicast ff00::",
			target:  &TargetAddr{Host: "[ff00::1]", Port: 80},
			wantErr: true,
			errMsg:  "multicast IPv6",
		},
		{
			name:    "IPv6 multicast ff02::",
			target:  &TargetAddr{Host: "[ff02::1]", Port: 80},
			wantErr: true,
			errMsg:  "multicast IPv6",
		},

		// Test IPv6 unspecified
		{
			name:    "IPv6 unspecified ::",
			target:  &TargetAddr{Host: "[::]", Port: 80},
			wantErr: true,
			errMsg:  "unspecified IPv6",
		},

		// Test valid IPv4
		{
			name:    "Valid IPv4 public",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 443},
			wantErr: false,
		},
		{
			name:    "Valid IPv4 public 2",
			target:  &TargetAddr{Host: "1.1.1.1", Port: 80},
			wantErr: false,
		},

		// Test valid IPv6
		{
			name:    "Valid IPv6 public",
			target:  &TargetAddr{Host: "[2001:4860:4860::8888]", Port: 443},
			wantErr: false,
		},
		{
			name:    "Valid IPv6 public without brackets",
			target:  &TargetAddr{Host: "2001:4860:4860::8888", Port: 443},
			wantErr: false,
		},

		// Test domain validation
		{
			name:    "Domain localhost",
			target:  &TargetAddr{Host: "localhost", Port: 80},
			wantErr: true,
			errMsg:  "localhost domain",
		},
		{
			name:    "Domain local",
			target:  &TargetAddr{Host: "local", Port: 80},
			wantErr: true,
			errMsg:  "localhost domain",
		},
		{
			name:    "Domain with brackets (invalid)",
			target:  &TargetAddr{Host: "[example.com]", Port: 80},
			wantErr: true,
			errMsg:  "brackets not allowed in domain",
		},
		{
			name:    "Valid domain",
			target:  &TargetAddr{Host: "example.com", Port: 443},
			wantErr: false,
		},
		{
			name:    "Valid domain google.com",
			target:  &TargetAddr{Host: "google.com", Port: 80},
			wantErr: false,
		},
		{
			name:    "Valid domain with subdomain",
			target:  &TargetAddr{Host: "www.example.com", Port: 443},
			wantErr: false,
		},

		// Test blocked ports
		{
			name:    "Blocked port 22 (SSH)",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 22},
			wantErr: false, // Port validation happens separately in CreateTunnel
		},
		{
			name:    "Blocked port 25 (SMTP)",
			target:  &TargetAddr{Host: "8.8.8.8", Port: 25},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTargetAddress(tt.target)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTargetAddress() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errMsg != "" {
				if err.Error() != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateTargetAddress() error = %v, should contain %v", err, tt.errMsg)
				}
			}
		})
	}
}

func TestValidateIPAddress(t *testing.T) {
	tests := []struct {
		name    string
		ip      net.IP
		wantErr bool
		errMsg  string
	}{
		{
			name:    "IPv4 loopback",
			ip:      net.ParseIP("127.0.0.1"),
			wantErr: true,
			errMsg:  "loopback",
		},
		{
			name:    "IPv4 private 10.0.0.1",
			ip:      net.ParseIP("10.0.0.1"),
			wantErr: true,
			errMsg:  "private",
		},
		{
			name:    "IPv4 valid public",
			ip:      net.ParseIP("8.8.8.8"),
			wantErr: false,
		},
		{
			name:    "IPv6 loopback",
			ip:      net.ParseIP("::1"),
			wantErr: true,
			errMsg:  "loopback",
		},
		{
			name:    "IPv6 valid public",
			ip:      net.ParseIP("2001:4860:4860::8888"),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateIPAddress(tt.ip)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateIPAddress() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errMsg != "" {
				if err.Error() != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("validateIPAddress() error = %v, should contain %v", err, tt.errMsg)
				}
			}
		})
	}
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
