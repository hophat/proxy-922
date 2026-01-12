import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import { Socks5Proxy, ProxyStatus } from '../proxies/proxies.entity';
import { dataSourceOptions } from '../data-source';

// Load .env from project root
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  // Fallback to default .env loading
  config();
}

function encryptPassword(password: string): string {
  const algorithm = 'aes-256-cbc';
  let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';
  
  // Ensure key is exactly 32 bytes for AES-256
  if (keyString.length < 32) {
    // Pad with default string
    keyString = keyString.padEnd(32, '!');
  } else if (keyString.length > 32) {
    // Truncate to 32 bytes
    keyString = keyString.substring(0, 32);
  }
  
  const key = Buffer.from(keyString, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function parseProxyLine(line: string): { host: string; port: number; username?: string; password?: string } | null {
  const parts = line.split(':');
  if (parts.length < 2) {
    return null;
  }

  const host = parts[0].trim();
  const port = parseInt(parts[1].trim(), 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return null;
  }

  const username = parts[2]?.trim() || undefined;
  const password = parts[3]?.trim() || undefined;

  return { host, port, username, password };
}

async function importProxies() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const proxyRepository = dataSource.getRepository(Socks5Proxy);

  // Read proxies from file
  // Try multiple possible paths
  let filePath = path.join(__dirname, '../proxies-list.txt'); // backend/proxies-list.txt
  if (!fs.existsSync(filePath)) {
    // Try relative to project root
    filePath = path.join(process.cwd(), 'proxies-list.txt');
    if (!fs.existsSync(filePath)) {
      // Try from backend directory
      filePath = path.join(__dirname, '../../../proxies-list.txt');
      if (!fs.existsSync(filePath)) {
        // Try absolute path in container
        filePath = '/app/proxies-list.txt';
        if (!fs.existsSync(filePath)) {
          console.error(`✗ File not found. Tried:`);
          console.error(`  - ${path.join(__dirname, '../proxies-list.txt')}`);
          console.error(`  - ${path.join(process.cwd(), 'proxies-list.txt')}`);
          console.error(`  - ${path.join(__dirname, '../../../proxies-list.txt')}`);
          console.error(`  - /app/proxies-list.txt`);
          process.exit(1);
        }
      }
    }
  }
  
  console.log(`📂 Reading proxies from: ${filePath}`);

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  console.log(`📄 Found ${lines.length} proxy lines in file`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const line of lines) {
    try {
      const proxyData = parseProxyLine(line.trim());
      if (!proxyData) {
        console.warn(`⚠ Skipping invalid line: ${line}`);
        skipped++;
        continue;
      }

      // Check if proxy already exists
      const existing = await proxyRepository.findOne({
        where: {
          host: proxyData.host,
          port: proxyData.port,
        },
      });

      if (existing) {
        console.log(`⏭ Skipping existing proxy: ${proxyData.host}:${proxyData.port}`);
        skipped++;
        continue;
      }

      // Create new proxy
      const proxy = proxyRepository.create({
        host: proxyData.host,
        port: proxyData.port,
        username: proxyData.username || null,
        passwordEncrypted: proxyData.password ? encryptPassword(proxyData.password) : null,
        status: ProxyStatus.ACTIVE,
        consecutiveFailures: 0,
      });

      await proxyRepository.save(proxy);
      imported++;
      console.log(`✓ Imported: ${proxyData.host}:${proxyData.port}`);
    } catch (error) {
      console.error(`✗ Error importing line "${line}":`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`  ✓ Imported: ${imported}`);
  console.log(`  ⏭ Skipped: ${skipped}`);
  console.log(`  ✗ Errors: ${errors}`);

  await dataSource.destroy();
  console.log('\n✓ Import completed');
}

importProxies().catch((error) => {
  console.error('✗ Import failed:', error);
  process.exit(1);
});

