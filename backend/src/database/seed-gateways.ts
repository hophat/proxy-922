import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Gateway, GatewayStatus } from '../gateways/gateways.entity';
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

async function seedGateways() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const gatewayRepository = dataSource.getRepository(Gateway);

  // Kiểm tra xem đã có gateway chưa
  const existingGateways = await gatewayRepository.count();
  if (existingGateways > 0) {
    console.log(`✓ Đã có ${existingGateways} gateway trong database`);
    const allGateways = await gatewayRepository.find();
    console.log('\n📋 Danh sách gateway hiện tại:');
    allGateways.forEach((gw) => {
      console.log(`  - ${gw.ip} (${gw.portRangeStart}-${gw.portRangeEnd}) - Status: ${gw.status}`);
    });
    await dataSource.destroy();
    return;
  }

  // Tạo gateway mẫu
  // Bạn có thể thay đổi thông tin này theo nhu cầu
  const sampleGateways = [
    {
      ip: 'localhost', // IP của gateway server (localhost cho local dev)
      portRangeStart: 3000,
      portRangeEnd: 10000,
      status: GatewayStatus.ACTIVE,
    },
    // Có thể thêm nhiều gateway khác nếu cần
  ];

  console.log('📦 Đang tạo gateway mẫu...\n');

  for (const gwData of sampleGateways) {
    const gateway = gatewayRepository.create(gwData);
    await gatewayRepository.save(gateway);
    console.log(`✓ Đã tạo gateway: ${gwData.ip} (${gwData.portRangeStart}-${gwData.portRangeEnd})`);
  }

  await dataSource.destroy();
  console.log('\n✅ Hoàn tất! Gateway đã được tạo.');
  console.log('\n💡 Lưu ý: Sau khi tạo gateway, bạn có thể tạo port pool bằng cách:');
  console.log('   POST /gateway-ports/pool với body:');
  console.log('   {');
  console.log('     "gatewayId": "<gateway-id>",');
  console.log('     "startPort": 3000,');
  console.log('     "endPort": 10000');
  console.log('   }');
}

seedGateways().catch((error) => {
  console.error('❌ Lỗi khi tạo gateway:', error);
  process.exit(1);
});
