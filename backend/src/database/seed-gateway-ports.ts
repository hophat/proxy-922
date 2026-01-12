import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Gateway, GatewayStatus } from '../gateways/gateways.entity';
import { GatewayPort, GatewayPortStatus } from '../gateway-ports/gateway-ports.entity';
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

async function seedGatewayPorts() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const gatewayRepository = dataSource.getRepository(Gateway);
  const portRepository = dataSource.getRepository(GatewayPort);

  // Lấy tất cả gateways
  const gateways = await gatewayRepository.find({
    where: { status: GatewayStatus.ACTIVE },
  });

  if (gateways.length === 0) {
    console.log('❌ Không tìm thấy gateway nào. Vui lòng chạy: npm run seed:gateways');
    await dataSource.destroy();
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${gateways.length} gateway(s)\n`);

  for (const gateway of gateways) {
    // Kiểm tra xem đã có ports chưa
    const existingPortsCount = await portRepository.count({
      where: { gatewayId: gateway.id },
    });

    if (existingPortsCount > 0) {
      const availablePortsCount = await portRepository.count({
        where: { gatewayId: gateway.id, status: GatewayPortStatus.AVAILABLE },
      });
      console.log(
        `⏭️  Gateway ${gateway.ip} (${gateway.portRangeStart}-${gateway.portRangeEnd}) đã có ${existingPortsCount} ports (${availablePortsCount} available)`,
      );
      continue;
    }

    console.log(
      `📦 Đang tạo ports cho gateway ${gateway.ip} (${gateway.portRangeStart}-${gateway.portRangeEnd})...`,
    );

    const ports: GatewayPort[] = [];
    for (let port = gateway.portRangeStart; port <= gateway.portRangeEnd; port++) {
      const gatewayPort = portRepository.create({
        gatewayId: gateway.id,
        port,
        status: GatewayPortStatus.AVAILABLE,
      });
      ports.push(gatewayPort);
    }

    // Chia nhỏ batch để tránh memory issue
    const batchSize = 1000;
    let created = 0;
    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      await portRepository.save(batch);
      created += batch.length;
      process.stdout.write(`\r  ⏳ Đã tạo ${created}/${ports.length} ports...`);
    }
    console.log(`\n  ✅ Đã tạo ${created} ports cho gateway ${gateway.ip}`);
  }

  await dataSource.destroy();
  console.log('\n✅ Hoàn tất!');
}

seedGatewayPorts().catch((error) => {
  console.error('❌ Lỗi khi tạo ports:', error);
  process.exit(1);
});
