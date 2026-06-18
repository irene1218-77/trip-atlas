export interface City {
  name: string
  nameEn: string
  lat: number
  lng: number
}

export interface Destination {
  country: string
  countryEn: string
  cities: City[]
}

export const DESTINATIONS: Destination[] = [
  {
    country: '泰國', countryEn: 'Thailand',
    cities: [
      { name: '普吉島', nameEn: 'Phuket',      lat: 7.88,  lng: 98.39 },
      { name: '曼谷',   nameEn: 'Bangkok',     lat: 13.76, lng: 100.50 },
      { name: '清邁',   nameEn: 'Chiang Mai',  lat: 18.79, lng: 98.99 },
      { name: '清萊',   nameEn: 'Chiang Rai',  lat: 19.91, lng: 99.84 },
      { name: '蘇美島', nameEn: 'Koh Samui',   lat: 9.51,  lng: 100.01 },
      { name: '芭達雅', nameEn: 'Pattaya',     lat: 12.92, lng: 100.88 },
      { name: '喀比',   nameEn: 'Krabi',       lat: 8.09,  lng: 98.91 },
      { name: '華欣',   nameEn: 'Hua Hin',     lat: 12.57, lng: 99.96 },
    ],
  },
  {
    country: '印尼', countryEn: 'Indonesia',
    cities: [
      { name: '峇里島', nameEn: 'Bali',       lat: -8.41,  lng: 115.19 },
      { name: '雅加達', nameEn: 'Jakarta',    lat: -6.21,  lng: 106.85 },
      { name: '日惹',   nameEn: 'Yogyakarta', lat: -7.80,  lng: 110.37 },
      { name: '龍目島', nameEn: 'Lombok',     lat: -8.65,  lng: 116.32 },
      { name: '科莫多', nameEn: 'Komodo',     lat: -8.55,  lng: 119.49 },
    ],
  },
  {
    country: '越南', countryEn: 'Vietnam',
    cities: [
      { name: '胡志明市', nameEn: 'Ho Chi Minh City', lat: 10.82, lng: 106.63 },
      { name: '河內',     nameEn: 'Hanoi',             lat: 21.03, lng: 105.85 },
      { name: '峴港',     nameEn: 'Da Nang',           lat: 16.05, lng: 108.20 },
      { name: '會安',     nameEn: 'Hoi An',            lat: 15.88, lng: 108.34 },
      { name: '下龍灣',   nameEn: 'Ha Long Bay',       lat: 20.91, lng: 107.08 },
      { name: '芽莊',     nameEn: 'Nha Trang',         lat: 12.24, lng: 109.20 },
      { name: '富國島',   nameEn: 'Phu Quoc',          lat: 10.29, lng: 103.98 },
    ],
  },
  {
    country: '馬來西亞', countryEn: 'Malaysia',
    cities: [
      { name: '吉隆坡', nameEn: 'Kuala Lumpur',  lat: 3.14,  lng: 101.69 },
      { name: '檳城',   nameEn: 'Penang',         lat: 5.41,  lng: 100.33 },
      { name: '亞庇',   nameEn: 'Kota Kinabalu',  lat: 5.98,  lng: 116.07 },
      { name: '古晉',   nameEn: 'Kuching',        lat: 1.55,  lng: 110.36 },
      { name: '蘭卡威', nameEn: 'Langkawi',       lat: 6.35,  lng: 99.80 },
    ],
  },
  {
    country: '新加坡', countryEn: 'Singapore',
    cities: [
      { name: '新加坡', nameEn: 'Singapore', lat: 1.35, lng: 103.82 },
    ],
  },
  {
    country: '菲律賓', countryEn: 'Philippines',
    cities: [
      { name: '馬尼拉', nameEn: 'Manila',   lat: 14.60, lng: 120.98 },
      { name: '長灘島', nameEn: 'Boracay',  lat: 11.97, lng: 121.92 },
      { name: '宿霧',   nameEn: 'Cebu',     lat: 10.32, lng: 123.89 },
      { name: '巴拉望', nameEn: 'Palawan',  lat: 9.74,  lng: 118.74 },
      { name: '薄荷島', nameEn: 'Bohol',    lat: 9.65,  lng: 123.85 },
    ],
  },
  {
    country: '柬埔寨', countryEn: 'Cambodia',
    cities: [
      { name: '暹粒',   nameEn: 'Siem Reap',     lat: 13.36, lng: 103.86 },
      { name: '金邊',   nameEn: 'Phnom Penh',    lat: 11.56, lng: 104.93 },
      { name: '西哈努克', nameEn: 'Sihanoukville', lat: 10.63, lng: 103.52 },
    ],
  },
  {
    country: '日本', countryEn: 'Japan',
    cities: [
      { name: '東京',   nameEn: 'Tokyo',     lat: 35.68, lng: 139.65 },
      { name: '大阪',   nameEn: 'Osaka',     lat: 34.69, lng: 135.50 },
      { name: '京都',   nameEn: 'Kyoto',     lat: 35.01, lng: 135.77 },
      { name: '北海道', nameEn: 'Hokkaido',  lat: 43.06, lng: 141.35 },
      { name: '沖繩',   nameEn: 'Okinawa',   lat: 26.21, lng: 127.68 },
      { name: '福岡',   nameEn: 'Fukuoka',   lat: 33.59, lng: 130.40 },
      { name: '奈良',   nameEn: 'Nara',      lat: 34.69, lng: 135.80 },
      { name: '廣島',   nameEn: 'Hiroshima', lat: 34.39, lng: 132.46 },
    ],
  },
  {
    country: '韓國', countryEn: 'South Korea',
    cities: [
      { name: '首爾',   nameEn: 'Seoul',     lat: 37.57, lng: 126.98 },
      { name: '釜山',   nameEn: 'Busan',     lat: 35.18, lng: 129.08 },
      { name: '濟州島', nameEn: 'Jeju',      lat: 33.49, lng: 126.50 },
      { name: '仁川',   nameEn: 'Incheon',   lat: 37.46, lng: 126.71 },
      { name: '慶州',   nameEn: 'Gyeongju',  lat: 35.86, lng: 129.22 },
    ],
  },
  {
    country: '台灣', countryEn: 'Taiwan',
    cities: [
      { name: '台北', nameEn: 'Taipei',    lat: 25.03, lng: 121.57 },
      { name: '台中', nameEn: 'Taichung',  lat: 24.15, lng: 120.67 },
      { name: '台南', nameEn: 'Tainan',    lat: 23.00, lng: 120.23 },
      { name: '高雄', nameEn: 'Kaohsiung', lat: 22.63, lng: 120.30 },
      { name: '花蓮', nameEn: 'Hualien',   lat: 23.98, lng: 121.60 },
      { name: '墾丁', nameEn: 'Kenting',   lat: 21.94, lng: 120.79 },
    ],
  },
  {
    country: '中國', countryEn: 'China',
    cities: [
      { name: '上海',   nameEn: 'Shanghai',     lat: 31.23, lng: 121.47 },
      { name: '北京',   nameEn: 'Beijing',      lat: 39.90, lng: 116.41 },
      { name: '成都',   nameEn: 'Chengdu',      lat: 30.57, lng: 104.07 },
      { name: '桂林',   nameEn: 'Guilin',       lat: 25.27, lng: 110.29 },
      { name: '西安',   nameEn: "Xi'an",        lat: 34.34, lng: 108.94 },
      { name: '杭州',   nameEn: 'Hangzhou',     lat: 30.27, lng: 120.16 },
      { name: '張家界', nameEn: 'Zhangjiajie',  lat: 29.12, lng: 110.48 },
    ],
  },
  {
    country: '法國', countryEn: 'France',
    cities: [
      { name: '巴黎',   nameEn: 'Paris',     lat: 48.86, lng: 2.35 },
      { name: '尼斯',   nameEn: 'Nice',      lat: 43.71, lng: 7.26 },
      { name: '里昂',   nameEn: 'Lyon',      lat: 45.76, lng: 4.84 },
      { name: '波爾多', nameEn: 'Bordeaux',  lat: 44.84, lng: -0.58 },
      { name: '普羅旺斯', nameEn: 'Provence', lat: 43.93, lng: 5.73 },
    ],
  },
  {
    country: '義大利', countryEn: 'Italy',
    cities: [
      { name: '羅馬',     nameEn: 'Rome',         lat: 41.90, lng: 12.50 },
      { name: '米蘭',     nameEn: 'Milan',        lat: 45.46, lng: 9.19 },
      { name: '佛羅倫斯', nameEn: 'Florence',     lat: 43.77, lng: 11.26 },
      { name: '威尼斯',   nameEn: 'Venice',       lat: 45.44, lng: 12.32 },
      { name: '那不勒斯', nameEn: 'Naples',       lat: 40.85, lng: 14.27 },
      { name: '阿瑪菲海岸', nameEn: 'Amalfi Coast', lat: 40.63, lng: 14.60 },
    ],
  },
  {
    country: '西班牙', countryEn: 'Spain',
    cities: [
      { name: '巴塞隆納', nameEn: 'Barcelona', lat: 41.39, lng: 2.17 },
      { name: '馬德里',   nameEn: 'Madrid',    lat: 40.42, lng: -3.70 },
      { name: '塞維亞',   nameEn: 'Seville',   lat: 37.39, lng: -5.98 },
      { name: '巴倫西亞', nameEn: 'Valencia',  lat: 39.47, lng: -0.38 },
      { name: '格拉納達', nameEn: 'Granada',   lat: 37.18, lng: -3.60 },
    ],
  },
  {
    country: '英國', countryEn: 'United Kingdom',
    cities: [
      { name: '倫敦',   nameEn: 'London',     lat: 51.51, lng: -0.13 },
      { name: '愛丁堡', nameEn: 'Edinburgh',  lat: 55.95, lng: -3.19 },
      { name: '牛津',   nameEn: 'Oxford',     lat: 51.75, lng: -1.26 },
      { name: '曼徹斯特', nameEn: 'Manchester', lat: 53.48, lng: -2.24 },
      { name: '巴斯',   nameEn: 'Bath',       lat: 51.38, lng: -2.36 },
    ],
  },
  {
    country: '德國', countryEn: 'Germany',
    cities: [
      { name: '柏林',   nameEn: 'Berlin',    lat: 52.52, lng: 13.41 },
      { name: '慕尼黑', nameEn: 'Munich',    lat: 48.14, lng: 11.58 },
      { name: '漢堡',   nameEn: 'Hamburg',   lat: 53.55, lng: 9.99 },
      { name: '科隆',   nameEn: 'Cologne',   lat: 50.93, lng: 6.95 },
      { name: '法蘭克福', nameEn: 'Frankfurt', lat: 50.11, lng: 8.68 },
    ],
  },
  {
    country: '希臘', countryEn: 'Greece',
    cities: [
      { name: '雅典',   nameEn: 'Athens',    lat: 37.98, lng: 23.73 },
      { name: '聖托里尼', nameEn: 'Santorini', lat: 36.39, lng: 25.46 },
      { name: '米克諾斯', nameEn: 'Mykonos',  lat: 37.45, lng: 25.33 },
      { name: '克里特島', nameEn: 'Crete',   lat: 35.34, lng: 25.14 },
    ],
  },
  {
    country: '澳洲', countryEn: 'Australia',
    cities: [
      { name: '雪梨',   nameEn: 'Sydney',      lat: -33.87, lng: 151.21 },
      { name: '墨爾本', nameEn: 'Melbourne',   lat: -37.81, lng: 144.96 },
      { name: '布里斯本', nameEn: 'Brisbane',  lat: -27.47, lng: 153.03 },
      { name: '凱恩斯', nameEn: 'Cairns',      lat: -16.92, lng: 145.78 },
      { name: '黃金海岸', nameEn: 'Gold Coast', lat: -28.02, lng: 153.40 },
      { name: '艾爾斯岩', nameEn: 'Uluru',     lat: -25.34, lng: 131.04 },
    ],
  },
  {
    country: '美國', countryEn: 'United States',
    cities: [
      { name: '紐約',   nameEn: 'New York',       lat: 40.71,  lng: -74.01 },
      { name: '洛杉磯', nameEn: 'Los Angeles',    lat: 34.05,  lng: -118.24 },
      { name: '舊金山', nameEn: 'San Francisco',  lat: 37.77,  lng: -122.42 },
      { name: '拉斯維加斯', nameEn: 'Las Vegas',  lat: 36.17,  lng: -115.14 },
      { name: '夏威夷', nameEn: 'Hawaii',         lat: 21.31,  lng: -157.86 },
      { name: '邁阿密', nameEn: 'Miami',          lat: 25.76,  lng: -80.19 },
      { name: '芝加哥', nameEn: 'Chicago',        lat: 41.88,  lng: -87.63 },
    ],
  },
  {
    country: '土耳其', countryEn: 'Turkey',
    cities: [
      { name: '伊斯坦堡',   nameEn: 'Istanbul',   lat: 41.01, lng: 28.98 },
      { name: '卡帕多奇亞', nameEn: 'Cappadocia', lat: 38.64, lng: 34.83 },
      { name: '安塔利亞',   nameEn: 'Antalya',    lat: 36.90, lng: 30.71 },
      { name: '伊茲米爾',   nameEn: 'Izmir',      lat: 38.42, lng: 27.13 },
    ],
  },
  {
    country: '杜拜', countryEn: 'UAE',
    cities: [
      { name: '杜拜',   nameEn: 'Dubai',     lat: 25.20, lng: 55.27 },
      { name: '阿布達比', nameEn: 'Abu Dhabi', lat: 24.45, lng: 54.38 },
    ],
  },
  {
    country: '冰島', countryEn: 'Iceland',
    cities: [
      { name: '雷克雅維克', nameEn: 'Reykjavik',    lat: 64.14, lng: -21.90 },
      { name: '南岸',       nameEn: 'South Coast',  lat: 63.53, lng: -19.08 },
      { name: '北部',       nameEn: 'North Iceland', lat: 65.68, lng: -18.09 },
    ],
  },
]
