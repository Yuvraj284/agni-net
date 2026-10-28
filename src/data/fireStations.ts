import type { FireStation } from '../types';

/**
 * DEMO / SAMPLE fire stations directory for AgniNet.
 * Real stations and realistic approximations for emergency response simulation across
 * the 5 monitored regions.
 */
export const FIRE_STATIONS: FireStation[] = [
  // Uttarakhand (uk)
  {
    id: 'fs-uk-ramnagar',
    name: 'Ramnagar Fire Station',
    regionId: 'uk',
    location: [29.398, 79.124],
    address: 'Station Road, Near Bus Terminal, Ramnagar, Nainital, Uttarakhand',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Station Fire Officer (SFO) B.S. Rawat',
    appliances: '2 Water Tenders, 1 Quick Response Vehicle (QRV)',
  },
  {
    id: 'fs-uk-almora',
    name: 'Almora Central Fire Station',
    regionId: 'uk',
    location: [29.601, 79.662],
    address: 'Mall Road, Upper Bazar, Almora, Uttarakhand',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'SFO H.C. Joshi',
    appliances: '2 Mini Tenders (Hill Spec), 1 Foam Tender',
  },
  {
    id: 'fs-uk-kotdwar',
    name: 'Kotdwar Fire Station',
    regionId: 'uk',
    location: [29.749, 78.528],
    address: 'Station Road, Kotdwar, Pauri Garhwal, Uttarakhand',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'SFO S.K. Negi',
    appliances: '2 Water Tenders, 1 High-Pressure Mist Unit',
  },

  // Madhya Pradesh (mp)
  {
    id: 'fs-mp-mandla',
    name: 'Mandla District Fire Headquarters',
    regionId: 'mp',
    location: [22.598, 80.37],
    address: 'Civil Lines, Near Collectorate, Mandla, Madhya Pradesh',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Fire Incharge R.K. Patel',
    appliances: '3 Water Tenders, 1 Emergency Rescue Tender (ERT)',
  },
  {
    id: 'fs-mp-baihar',
    name: 'Baihar Fire Station (Kanha Perimeter)',
    regionId: 'mp',
    location: [22.102, 80.551],
    address: 'Main Road, Baihar, Balaghat District, Madhya Pradesh',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'SFO D.S. Maravi',
    appliances: '1 4x4 Forest Tactical Water Tender, 1 QRV',
  },

  // Odisha (od)
  {
    id: 'fs-od-baripada',
    name: 'Baripada Fire Station (Similipal Desk)',
    regionId: 'od',
    location: [21.932, 86.735],
    address: 'Baghra Road, Baripada, Mayurbhanj, Odisha',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Station Officer P.K. Mohanty',
    appliances: '3 Heavy Water Tenders, 1 Forest Fire Combat Unit',
  },
  {
    id: 'fs-od-rourkela',
    name: 'Rourkela Sector-2 Fire Station',
    regionId: 'od',
    location: [22.235, 84.862],
    address: 'Sector 2, Near Ring Road, Rourkela, Sundargarh, Odisha',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'SFO A.N. Behera',
    appliances: '4 Multi-Purpose Tenders, 1 Chemical & Foam Unit',
  },
  {
    id: 'fs-od-keonjhar',
    name: 'Keonjhar Town Fire Station',
    regionId: 'od',
    location: [21.632, 85.589],
    address: 'Mining Road, Keonjhar, Odisha',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Station Officer M. Das',
    appliances: '2 Water Tenders, 1 Quick Response Vehicle',
  },

  // Mizoram (mz)
  {
    id: 'fs-mz-lunglei',
    name: 'Lunglei Fire Station',
    regionId: 'mz',
    location: [22.885, 92.738],
    address: 'Venglai, Lunglei, Mizoram',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Sub-Fire Officer K. Lalbiaka',
    appliances: '2 Mini Hill Tenders, 1 High-Pressure Fogging Unit',
  },
  {
    id: 'fs-mz-mamit',
    name: 'Mamit District Fire Station',
    regionId: 'mz',
    location: [23.929, 92.491],
    address: 'Field Veng, Mamit, Mizoram',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'SFO C. Zohmangaiha',
    appliances: '2 Hill-Terrain Water Tenders',
  },

  // Punjab (pb)
  {
    id: 'fs-pb-sangrur',
    name: 'Sangrur Central Fire Station',
    regionId: 'pb',
    location: [30.248, 75.842],
    address: 'Near Municipal Council Office, Sangrur, Punjab',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Fire Station Officer Gurtej Singh',
    appliances: '3 Water Tenders, 1 Foam Crash Tender',
  },
  {
    id: 'fs-pb-ludhiana',
    name: 'Ludhiana Central Fire Headquarters',
    regionId: 'pb',
    location: [30.908, 75.852],
    address: 'Mata Rani Chowk, Ludhiana, Punjab',
    phone: '+91 89587 05587',
    whatsappPhone: '918958705587',
    officerInCharge: 'Divisional Fire Officer Manjit Singh',
    appliances: '6 Water Tenders, 2 Hydraulic Platforms, 2 Rescue Tenders',
  },
];
