export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // Format: 192.168.1.***
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return ip;
}
