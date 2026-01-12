import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { config } from 'dotenv';
import { Socks5Proxy } from '../proxies/proxies.entity';
import { dataSourceOptions } from '../data-source';
import * as path from 'path';

// Load .env from project root
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

function encryptPassword(password: string): string {
  const algorithm = 'aes-256-cbc';
  let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';
  
  // Ensure key is exactly 32 bytes for AES-256
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

function decryptPassword(encrypted: string): string {
  const algorithm = 'aes-256-cbc';
  let keyString = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!';
  
  // Ensure key is exactly 32 bytes for AES-256
  if (keyString.length < 32) {
    keyString = keyString.padEnd(32, '!');
  } else if (keyString.length > 32) {
    keyString = keyString.substring(0, 32);
  }
  
  const key = Buffer.from(keyString, 'utf8');
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function updateProxyPasswords() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const proxyRepository = dataSource.getRepository(Socks5Proxy);
  const proxies = await proxyRepository.find();

  console.log(`📄 Found ${proxies.length} proxies to update`);

  let updated = 0;
  let errors = 0;

  for (const proxy of proxies) {
    try {
      if (!proxy.passwordEncrypted) {
        console.log(`⏭ Skipping proxy ${proxy.host}:${proxy.port} (no password)`);
        continue;
      }

      // Try to decrypt with old method (if it fails, password might already be correct)
      let password: string;
      try {
        password = decryptPassword(proxy.passwordEncrypted);
      } catch (err) {
        // If decryption fails, try to get password from proxies-list.txt
        console.log(`⚠ Failed to decrypt password for ${proxy.host}:${proxy.port}, trying to get from file...`);
        
        // Read from proxies-list.txt
        let filePath = '/app/proxies-list.txt';
        if (!fs.existsSync(filePath)) {
          filePath = path.join(__dirname, '../../../proxies-list.txt');
        }
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const lines = fileContent.split('\n').filter((line) => line.trim());
          
          const line = lines.find((l: string) => {
            const parts = l.split(':');
            return parts[0] === proxy.host && parseInt(parts[1]) === proxy.port;
          });
          
          if (line) {
            const parts = line.split(':');
            password = parts[3]?.trim() || '';
            console.log(`✓ Found password for ${proxy.host}:${proxy.port} from file`);
          } else {
            console.log(`✗ Password not found in file for ${proxy.host}:${proxy.port}`);
            errors++;
            continue;
          }
        } else {
          console.log(`✗ File not found, cannot update ${proxy.host}:${proxy.port}`);
          errors++;
          continue;
        }
      }

      // Re-encrypt with correct method
      const newEncrypted = encryptPassword(password);
      proxy.passwordEncrypted = newEncrypted;
      await proxyRepository.save(proxy);
      updated++;
      console.log(`✓ Updated password encryption for ${proxy.host}:${proxy.port}`);
    } catch (error) {
      console.error(`✗ Error updating ${proxy.host}:${proxy.port}:`, error);
      errors++;
    }
  }

  await dataSource.destroy();
  console.log(`\n✓ Update completed: ${updated} updated, ${errors} errors`);
}

updateProxyPasswords().catch((error) => {
  console.error('✗ Update failed:', error);
  process.exit(1);
});

