import axios from 'axios';
import { ThailandAddressData, ThaiProvince, ThaiDistrict, ThaiSubdistrict } from '../types';

/**
 * Address Service
 * Fetches Thai address data from GitHub API
 * https://github.com/kongvut/thai-province-data
 */
class AddressService {
  private cache: ThailandAddressData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

  private readonly PROVINCE_API = 'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json';
  private readonly DISTRICT_API = 'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json';
  private readonly SUB_DISTRICT_API = 'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/sub_district.json';

  /**
   * Get all address data (with caching)
   */
  async getAddressData(): Promise<ThailandAddressData> {
    // Return cached data if still valid
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // Fetch all data in parallel
      const [provinceResponse, districtResponse, subDistrictResponse] = await Promise.all([
        axios.get(this.PROVINCE_API, { timeout: 10000 }),
        axios.get(this.DISTRICT_API, { timeout: 10000 }),
        axios.get(this.SUB_DISTRICT_API, { timeout: 10000 }),
      ]);

      // Transform and normalize data
      const provinces = this.transformProvinces(provinceResponse.data);
      const districts = this.transformDistricts(districtResponse.data);
      const subdistricts = this.transformSubdistricts(subDistrictResponse.data);

      const addressData: ThailandAddressData = {
        provinces,
        districts,
        subdistricts,
      };

      // Cache the data
      this.cache = addressData;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return addressData;
    } catch (error: any) {
      console.error('Error fetching address data:', error.message);
      
      // Return cached data if available, even if expired
      if (this.cache) {
        console.warn('Using expired cache due to API error');
        return this.cache;
      }

      throw new Error('Failed to fetch address data from API');
    }
  }

  /**
   * Transform province data to our format
   */
  private transformProvinces(data: any): ThaiProvince[] {
    // Handle different API response formats
    let provincesArray: any[] = [];
    
    if (Array.isArray(data)) {
      provincesArray = data;
    } else if (typeof data === 'object') {
      // Could be object with keys or data property
      provincesArray = data.data || Object.values(data);
    }

    return provincesArray
      .map((item: any) => ({
        id: item.id || item.province_id || parseInt(item.province_id) || 0,
        name_th: item.name_th || item.name || item.province_name_th || '',
        name_en: item.name_en || item.province_name_en || item.name || '',
      }))
      .filter((p: ThaiProvince) => p.id > 0 && p.name_th)
      .sort((a: ThaiProvince, b: ThaiProvince) => 
        a.name_th.localeCompare(b.name_th, 'th')
      );
  }

  /**
   * Transform district data to our format
   */
  private transformDistricts(data: any): ThaiDistrict[] {
    let districtsArray: any[] = [];
    
    if (Array.isArray(data)) {
      districtsArray = data;
    } else if (typeof data === 'object') {
      districtsArray = data.data || Object.values(data);
    }

    return districtsArray
      .map((item: any) => ({
        id: item.id || item.district_id || parseInt(item.district_id) || 0,
        province_id: item.province_id || item.province?.id || parseInt(item.province_id) || 0,
        name_th: item.name_th || item.name || item.district_name_th || '',
        name_en: item.name_en || item.district_name_en || item.name || '',
      }))
      .filter((d: ThaiDistrict) => d.id > 0 && d.province_id > 0 && d.name_th)
      .sort((a: ThaiDistrict, b: ThaiDistrict) => 
        a.name_th.localeCompare(b.name_th, 'th')
      );
  }

  /**
   * Transform subdistrict data to our format
   */
  private transformSubdistricts(data: any): ThaiSubdistrict[] {
    let subDistrictsArray: any[] = [];
    
    if (Array.isArray(data)) {
      subDistrictsArray = data;
    } else if (typeof data === 'object') {
      subDistrictsArray = data.data || Object.values(data);
    }

    return subDistrictsArray
      .map((item: any) => ({
        id: item.id || item.sub_district_id || item.subdistrict_id || parseInt(item.sub_district_id) || 0,
        district_id: item.district_id || item.district?.id || parseInt(item.district_id) || 0,
        name_th: item.name_th || item.name || item.sub_district_name_th || item.subdistrict_name_th || '',
        name_en: item.name_en || item.sub_district_name_en || item.subdistrict_name_en || item.name || '',
        postal_code: item.postal_code || item.zip_code || item.postcode || item.zip || '',
      }))
      .filter((s: ThaiSubdistrict) => s.id > 0 && s.district_id > 0 && s.name_th)
      .sort((a: ThaiSubdistrict, b: ThaiSubdistrict) => 
        a.name_th.localeCompare(b.name_th, 'th')
      );
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const addressService = new AddressService();

