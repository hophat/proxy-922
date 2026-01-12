import { Injectable, Logger } from '@nestjs/common';

export interface GeoInfo {
  country: string;
  regionName: string;
  city: string;
  zip: string;
  isp: string;
  query: string;
}

@Injectable()
export class GeoLocationService {
  private readonly logger = new Logger(GeoLocationService.name);
  private readonly cache = new Map<string, GeoInfo>();

  async getGeoInfo(ip: string): Promise<GeoInfo | null> {
    // Check cache first
    if (this.cache.has(ip)) {
      return this.cache.get(ip);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        const geoInfo: GeoInfo = {
          country: data.country || '',
          regionName: data.regionName || '',
          city: data.city || '',
          zip: data.zip || '',
          isp: data.isp || '',
          query: data.query || ip,
        };

        // Cache the result
        this.cache.set(ip, geoInfo);

        return geoInfo;
      } else {
        this.logger.warn(`Failed to get geo info for IP ${ip}: ${data.message}`);
        return null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Timeout fetching geo info for IP ${ip}`);
      } else {
        this.logger.error(`Error fetching geo info for IP ${ip}: ${error.message}`);
      }
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

