import { createClient } from '@supabase/supabase-js'

// createClient 需要基底 URL（不含 /rest/v1/），這裡自動去除尾端路徑
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
