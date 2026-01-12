import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.entity';
import { Socks5Proxy, ProxyStatus } from '../proxies/proxies.entity';
import { dataSourceOptions } from '../data-source';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const proxyRepository = dataSource.getRepository(Socks5Proxy);

  // Seed admin user
  const adminEmail = 'admin@gmail.com';
  const existingUser = await userRepository.findOne({ where: { email: adminEmail } });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash('123123123', 10);
    const adminUser = userRepository.create({
      email: adminEmail,
      passwordHash,
      quotaTotal: 100 * 1024 * 1024 * 1024, // 100GB
      quotaUsed: 0,
      active: true,
    });
    await userRepository.save(adminUser);
    console.log(`✓ Created admin user: ${adminEmail} / 123123123`);
  } else {
    // Update existing admin user password if exists
    existingUser.passwordHash = await bcrypt.hash('123123123', 10);
    existingUser.active = true;
    await userRepository.save(existingUser);
    console.log(`✓ Updated admin user: ${adminEmail} / 123123123`);
  }

  // Seed test proxies (example - replace with real proxies)
  const existingProxies = await proxyRepository.count();
  if (existingProxies === 0) {
    const testProxies = [
      {
        host: '127.0.0.1',
        port: 1080,
        username: 'test',
        passwordEncrypted: 'test',
        status: ProxyStatus.ACTIVE,
      },
      // Add more test proxies here
    ];

    for (const proxyData of testProxies) {
      const proxy = proxyRepository.create(proxyData);
      await proxyRepository.save(proxy);
    }
    console.log(`✓ Created ${testProxies.length} test proxies`);
  } else {
    console.log(`✓ ${existingProxies} proxies already exist`);
  }

  await dataSource.destroy();
  console.log('✓ Seeding completed');
}

seed().catch((error) => {
  console.error('✗ Seeding failed:', error);
  process.exit(1);
});

