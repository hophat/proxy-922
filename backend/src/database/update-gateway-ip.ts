import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Gateway } from '../gateways/gateways.entity';
import { dataSourceOptions } from '../data-source';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

async function updateGatewayIP() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const gatewayRepository = dataSource.getRepository(Gateway);

  // Lấy tất cả gateways
  const gateways = await gatewayRepository.find();

  if (gateways.length === 0) {
    console.log('❌ Không tìm thấy gateway nào trong database.');
    await dataSource.destroy();
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${gateways.length} gateway(s)\n`);

  for (const gateway of gateways) {
    console.log(`📝 Gateway hiện tại: ${gateway.ip} (${gateway.portRangeStart}-${gateway.portRangeEnd})`);
    
    // Update IP thành localhost
    gateway.ip = 'localhost';
    await gatewayRepository.save(gateway);
    
    console.log(`✅ Đã update gateway IP thành: localhost\n`);
  }

  await dataSource.destroy();
  console.log('✅ Hoàn tất!');
}

updateGatewayIP().catch((error) => {
  console.error('❌ Lỗi khi update gateway IP:', error);
  process.exit(1);
});
