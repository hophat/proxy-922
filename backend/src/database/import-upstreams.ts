import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { dataSourceOptions } from '../data-source';
import { Socks5Upstream, UpstreamStatus } from '../socks5-upstream/socks5-upstream.entity';
import * as crypto from 'crypto';

const dataSource = new DataSource(dataSourceOptions);

function encryptPassword(password: string): string {
  const algorithm = 'aes-256-cbc';
  let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';

  if (keyString.length < 32) {
    keyString = keyString.padEnd(32, '!');
  } else if (keyString.length > 32) {
    keyString = keyString.substring(0, 32);
  }

  const key = Buffer.from(keyString, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function importUpstreams() {
  await dataSource.initialize();
  console.log('✅ Connected to database');

  const upstreamRepository = dataSource.getRepository(Socks5Upstream);

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
      // Format: IP:PORT:USER:PASS or IP:PORT
      const parts = line.trim().split(':');
      if (parts.length < 2) {
        console.warn(`⚠️  Skipping invalid line: ${line}`);
        skipped++;
        continue;
      }

      const host = parts[0].trim();
      const port = parseInt(parts[1].trim(), 10);

      if (isNaN(port) || port < 1 || port > 65535) {
        console.warn(`⚠️  Skipping line with invalid port: ${line}`);
        skipped++;
        continue;
      }

      const username = parts[2]?.trim() || null;
      const password = parts[3]?.trim() || null;

      // Check if upstream already exists
      const existing = await upstreamRepository.findOne({
        where: { host, port },
      });

      if (existing) {
        console.log(`⏭️  Skipping existing upstream: ${host}:${port}`);
        skipped++;
        continue;
      }

      // Create upstream
      const upstream = upstreamRepository.create({
        host,
        port,
        username,
        passwordEncrypted: password ? encryptPassword(password) : null,
        status: UpstreamStatus.AVAILABLE,
        consecutiveFailures: 0,
      });

      await upstreamRepository.save(upstream);
      imported++;
      console.log(`✅ Imported: ${host}:${port}`);
    } catch (error: any) {
      console.error(`❌ Error importing line "${line}":`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📝 Total: ${lines.length}`);

  await dataSource.destroy();
  console.log('\n✅ Import completed');
}

importUpstreams().catch((error) => {
  console.error('✗ Import failed:', error);
  process.exit(1);
});
