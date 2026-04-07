/**
 * Supabase Client — точка входа
 *
 * import { supabase } from './js/supabaseclient/index.js'
 *
 * supabase.init('https://xxx.supabase.co', 'anon-key')
 * await supabase.auth.signIn(email, password)
 * await supabase.from('portfolio').select('*').execute()
 */

import { init }                              from './client.js';
import { signUp, signIn, signOut, getUser, onAuthStateChange } from './auth.js';
import { from }                              from './db.js';

const supabase = {
  init,
  auth: { signUp, signIn, signOut, getUser, onAuthStateChange },
  from,
};

export { supabase };
