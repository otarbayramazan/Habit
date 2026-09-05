import { createClient } from '@supabase/supabase-js';

// Paste your actual Supabase URL and Anon Key directly inside the quotes below
const supabaseUrl = 'https://fjbadogrszjqhqwqntxj.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFkb2dyc3pqcWhxd3FudHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNTYzODgsImV4cCI6MjEwMzgzMjM4OH0.ERjzGulHNVS2jtm5czLMQ8-UmLWv-ksU94Mt4yNoMRQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
