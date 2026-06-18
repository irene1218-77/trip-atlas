// 對應 Supabase trips 表
export interface Trip {
  id: string
  created_at: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  cover_image?: string
  trip_notes?: { text: string; created_at: string }[]
}

// 對應 Supabase places 表
export interface Place {
  id: string
  created_at: string
  trip_id: string
  name: string
  category: string
  my_notes?: string
  lat?: number
  lng?: number
  address?: string
  google_place_id?: string
  place_type?: string
  tips_pros?: string[]
  tips_cons?: string[]
  price_info?: string
  interest_rating?: number
  estimated_cost?: number
}

// 對應 Supabase lists 表
export interface List {
  id: string
  created_at: string
  trip_id: string
  name: string
  color: string
}

// 對應 Supabase place_lists 表
export interface PlaceList {
  id: string
  created_at: string
  place_id: string
  list_id: string
}

// 對應 Supabase place_links 表
export interface PlaceLink {
  id: string
  created_at: string
  place_id: string
  url: string
  title?: string
  thumbnail_url?: string
  platform: 'ig' | 'youtube' | 'other'
}

// 對應 Supabase itinerary 表（行程規劃）
export interface Itinerary {
  id: string
  created_at: string
  trip_id: string
  day_number: number       // 第幾天，從 1 開始
  place_id: string
  order_index: number      // 同一天內的排序
  planned_time?: string       // 預計時間，例如 "09:00"
  transport_note?: string     // 交通備註，例如 "開車 · 20分鐘"
  duration_minutes?: number   // 停留時間（分鐘）
}

// 行程條目（含 place 資料，避免重複查詢）
export interface ItineraryItem extends Itinerary {
  place: Place             // join 後的地點完整資料
}
