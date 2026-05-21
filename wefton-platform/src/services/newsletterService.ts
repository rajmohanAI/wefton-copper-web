// ============================================================
// Wefton Copper — Newsletter Service (Firestore)
// ============================================================
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const NEWSLETTER_COL = 'newsletter_subscribers';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

/**
 * Subscribes an email to the newsletter.
 * Checks for duplicates before writing to Firestore.
 *
 * @param email - The email address to subscribe
 * @returns An object with success status and message
 */
export async function subscribeNewsletter(
  email: string
): Promise<{ success: boolean; message: string }> {
  const db = requireDb();

  // Check if email already exists in newsletter_subscribers
  const q = query(collection(db, NEWSLETTER_COL), where('email', '==', email));
  const snap = await getDocs(q);

  if (!snap.empty) {
    return { success: false, message: 'You are already subscribed' };
  }

  // Write new subscriber document
  await addDoc(collection(db, NEWSLETTER_COL), {
    email,
    subscribedAt: serverTimestamp(),
  });

  return { success: true, message: 'Successfully subscribed!' };
}
