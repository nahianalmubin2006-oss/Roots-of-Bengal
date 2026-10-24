import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, handleFirestoreError, OperationType } from './firebase';
import { LanguageCode } from '../types/heritage';

export const DESIGNATED_OWNER_EMAIL = 'nahianalmubin2006@gmail.com';

export interface AppUserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'customer' | 'admin' | 'super_admin';
  preferredLanguage: 'en' | 'bn';
  phone?: string;
  defaultAddress?: string;
  district?: string;
  thana?: string;
  postalCode?: string;
  isAdmin: boolean;
  adminRole?: 'admin' | 'super_admin';
}

/**
 * Server-backed verification of administrative credentials.
 * Checks Firebase Custom User Claims and the protected /adminUsers collection.
 * NEVER trusts client-side storage, localStorage, or unverified email strings.
 */
export async function checkIsUserAdmin(user: User | null): Promise<{ isAdmin: boolean; role?: 'admin' | 'super_admin' }> {
  if (!user) return { isAdmin: false };

  try {
    // 1. Check custom user claims
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.admin === true) {
      const role = (tokenResult.claims.role as 'admin' | 'super_admin') || 'admin';
      return { isAdmin: true, role };
    }

    // 2. Check protected /adminUsers/{uid} collection
    const adminSnap = await getDoc(doc(db, 'adminUsers', user.uid));
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      if (data?.role === 'admin' || data?.role === 'super_admin') {
        return { isAdmin: true, role: data.role };
      }
    }
  } catch {
    // On permission denied or network error, fail closed
    return { isAdmin: false };
  }

  return { isAdmin: false };
}

/**
 * Allows the verified project owner to claim their initial super_admin role.
 * Attempts server-side Cloud Function first, with safe fallback.
 */
export async function bootstrapOwnerAdmin(user: User): Promise<{ success: boolean; message: string }> {
  if (user.email !== DESIGNATED_OWNER_EMAIL || !user.emailVerified) {
    throw new Error('Only the verified repository owner may claim the initial admin credentials.');
  }

  try {
    const callable = httpsCallable(functions, 'adminBootstrapInitialAdmin');
    const res: any = await callable();
    await user.getIdToken(true); // Force token refresh to pick up custom claims
    return {
      success: true,
      message: res.data?.message || 'Admin credentials established successfully.',
    };
  } catch {
    // Fallback in environments where Cloud Functions are not deployed yet
    const adminRef = doc(db, 'adminUsers', user.uid);
    await setDoc(adminRef, {
      uid: user.uid,
      email: user.email,
      role: 'super_admin',
      grantedAt: serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      message: 'Owner initial admin credentials recorded in /adminUsers.',
    };
  }
}

export async function syncUserProfileToFirestore(
  user: User,
  preferredLanguage: LanguageCode = 'en'
): Promise<AppUserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'contact');
  const adminCheck = await checkIsUserAdmin(user);
  const normalizedLang: 'en' | 'bn' = preferredLanguage === 'bn' ? 'bn' : 'en';

  try {
    const existingSnap = await getDoc(userRef);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Heritage Patron').slice(0, 100);
    const email = user.email || '';
    // Public user documents always store role 'customer' to prevent self-assigned privilege escalation
    const role = 'customer';

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        email,
        role,
        preferredLanguage: normalizedLang,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: existingData.displayName || displayName,
          email: existingData.email || email,
          role: 'customer',
          preferredLanguage: existingData.preferredLanguage || normalizedLang,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

    let privateData: Record<string, string> = {};
    try {
      const privSnap = await getDoc(privateRef);
      if (privSnap.exists()) {
        privateData = privSnap.data() as Record<string, string>;
      }
    } catch {
      // Ignore if private doc does not exist yet
    }

    return {
      uid: user.uid,
      displayName,
      email,
      role: adminCheck.isAdmin ? (adminCheck.role || 'admin') : 'customer',
      preferredLanguage: normalizedLang,
      phone: privateData.phone || '',
      defaultAddress: privateData.defaultAddress || '',
      district: privateData.district || '',
      thana: privateData.thana || '',
      postalCode: privateData.postalCode || '',
      isAdmin: adminCheck.isAdmin,
      adminRole: adminCheck.role,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function saveUserPrivateContact(
  uid: string,
  contact: {
    phone?: string;
    defaultAddress?: string;
    district?: string;
    thana?: string;
    postalCode?: string;
  }
): Promise<void> {
  const privateRef = doc(db, 'users', uid, 'private', 'contact');
  try {
    await setDoc(
      privateRef,
      {
        uid,
        phone: (contact.phone || '').trim(),
        defaultAddress: (contact.defaultAddress || '').trim().slice(0, 500),
        district: (contact.district || '').trim().slice(0, 80),
        thana: (contact.thana || '').trim().slice(0, 80),
        postalCode: (contact.postalCode || '').trim().slice(0, 20),
        updatedAt: serverTimestamp(),
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/contact`);
  }
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
