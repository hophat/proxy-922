import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Socks5Upstream } from '../socks5-upstream/socks5-upstream.entity';
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

async function getGeoInfo(ip: string): Promise<{ country: string; regionName: string; city: string; zip: string; isp: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,isp,query`,
      {
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        country: data.country || '',
        regionName: data.regionName || '',
        city: data.city || '',
        zip: data.zip || '',
        isp: data.isp || '',
      };
    } else {
      console.warn(`Failed to get geo info for IP ${ip}: ${data.message}`);
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`Timeout fetching geo info for IP ${ip}`);
    } else {
      console.error(`Error fetching geo info for IP ${ip}: ${error.message}`);
    }
    return null;
  }
}

async function updateUpstreamGeo() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const upstreamRepository = dataSource.getRepository(Socks5Upstream);

  // Lấy tất cả upstreams
  const upstreams = await upstreamRepository.find();

  if (upstreams.length === 0) {
    console.log('❌ Không tìm thấy upstream nào trong database.');
    await dataSource.destroy();
    process.exit(1);
  }

  console.log(`📋 Tìm thấy ${upstreams.length} upstream(s)\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const upstream of upstreams) {
    try {
      console.log(`🔄 Đang cập nhật geo info cho ${upstream.host}:${upstream.port}...`);
      
      const geoInfo = await getGeoInfo(upstream.host);
      
      if (geoInfo) {
        upstream.country = geoInfo.country;
        upstream.state = geoInfo.regionName;
        upstream.city = geoInfo.city;
        upstream.zip = geoInfo.zip;
        upstream.isp = geoInfo.isp;
        await upstreamRepository.save(upstream);
        
        console.log(`✅ Đã cập nhật: ${geoInfo.country}, ${geoInfo.regionName}, ${geoInfo.city}\n`);
        updated++;
      } else {
        console.log(`⏭️  Bỏ qua (không lấy được geo info)\n`);
        skipped++;
      }

      // Add delay to avoid rate limiting (45 requests per minute for free tier)
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error: any) {
      console.error(`❌ Lỗi khi cập nhật ${upstream.host}:${upstream.port}:`, error.message);
      failed++;
    }
  }

  await dataSource.destroy();
  console.log(`\n✅ Hoàn tất!`);
  console.log(`   - Đã cập nhật: ${updated}`);
  console.log(`   - Bỏ qua: ${skipped}`);
  console.log(`   - Lỗi: ${failed}`);
}

updateUpstreamGeo().catch((error) => {
  console.error('❌ Lỗi khi update upstream geo info:', error);
  process.exit(1);
});
