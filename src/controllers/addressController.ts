import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import { ApiResponse, ThailandAddressData } from '../types';
import { addressService } from '../services/addressService';

/**
 * Get Thailand address data from GitHub API
 * GET /api/addresses/thailand
 * 
 * Fetches data from: https://github.com/kongvut/thai-province-data
 * Returns provinces, districts, subdistricts, and postal codes
 * in a structure suitable for building dependent dropdowns
 * 
 * Data is cached for 1 hour to reduce API calls
 */
export const getThailandAddresses = asyncHandler(async (req: Request, res: Response) => {
  try {
    const addressData = await addressService.getAddressData();

    const response: ApiResponse<ThailandAddressData> = {
      success: true,
      data: addressData,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching address data:', error.message);
    
    const response: ApiResponse<ThailandAddressData> = {
      success: false,
      data: {
        provinces: [],
        districts: [],
        subdistricts: [],
      },
      error: 'Failed to fetch address data from API. Please try again later.',
    };

    res.status(500).json(response);
  }
});

