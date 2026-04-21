import { init }                              from './client.js';
import { signUp, signIn, signOut, getUser, onAuthStateChange } from './auth.js';
import { from }                              from './db.js';

const supabase = {
  init,
  auth: { signUp, signIn, signOut, getUser, onAuthStateChange },
  from,
};

export { supabase };
