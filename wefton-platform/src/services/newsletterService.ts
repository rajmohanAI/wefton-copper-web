// ============================================================
// Wefton Copper — Newsletter Service (Firestore)
// ============================================================
import { doc, setDoc, serverTimestamp, FirestoreError } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const NEWSLETTER_COL = 'newsletter_subscribers';

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  return db;
}

/**
 * Subscribes an email to the newsletter.
 * The doc id is the normalised email. Security rules allow creating a new
 * subscriber but not overwriting one, so a duplicate shows up as
 * permission-denied (subscribers are not readable from the client).
 *
 * @param email - The email address to subscribe
 * @returns An object with success status and message
 */
export async function subscribeNewsletter(
  email: string
): Promise<{ success: boolean; message: string }> {
  const db = requireDb();
  const normalised = email.trim().toLowerCase();

  try {
    await setDoc(doc(db, NEWSLETTER_COL, normalised), {
      email: normalised,
      subscribedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err instanceof FirestoreError && err.code === 'permission-denied') {
      return { success: false, message: 'You are already subscribed' };
    }
    throw err;
  }

  return { success: true, message: 'Successfully subscribed!' };
}
