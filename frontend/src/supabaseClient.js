import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kauvudxnitfxtghnwfii.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdXZ1ZHhuaXRmeHRnaG53ZmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMTg2NDIsImV4cCI6MjA2Mjc5NDY0Mn0.L-VB5QUg5H8W9fK8bcIXgmiqiqAJtOtTFY3OopTX7A0'

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase;

