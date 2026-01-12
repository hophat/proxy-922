export function formatSocks5Connection(
  ip: string,
  port: number,
  username: string,
  password: string,
): string {
  return `socks5://${username}:${password}@${ip}:${port}`;
}

export function formatRotatingProxyConnection(
  domain: string,
  apiKey: string,
  port: number = 1080,
): string {
  return `socks5://${apiKey}@${domain}:${port}`;
}

export function formatRotationInterval(intervalMinutes: number): string {
  switch (intervalMinutes) {
    case 5:
      return '5 phút';
    case 15:
      return '15 phút';
    case 60:
      return '60 phút';
    default:
      return `${intervalMinutes} phút`;
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
