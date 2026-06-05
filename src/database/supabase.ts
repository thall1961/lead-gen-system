import { createClient } from '@supabase/supabase-js';
import config from '../config/index';
import { Lead } from '../types/index';

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: Partial<Lead>;
        Update: Partial<Lead>;
      };
    };
  };
};

const supabase = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

export default supabase;
