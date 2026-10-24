import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
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
 * Zero-Trust Server-Backed Verification of Administrative Credentials.
 *
 * Security Invariants:
 * 1. NEVER trusts client-side storage, localStorage, or bare email strings.
 * 2. If custom user claims explicitly deny admin access (`claims.admin === false` or `claims.role === 'none'`),
 *    immediately denies access even if a stale Firestore document exists.
 * 3. ALWAYS verifies the live `/adminUsers/{uid}` Firestore document (`exists()`, `revoked !== true`,
 *    and `role in ['admin', 'super_admin']`) so that revoking a role in Firestore takes effect
 *    immediately without waiting for a 60-minute JWT to expire.
 */
export async function checkIsUserAdmin(
  user: User | null
): Promise<{ isAdmin: boolean; role?: 'admin' | 'super_admin' }> {
  if (!user) return { isAdmin: false };

  try {
    // 1. Inspect Firebase Auth ID token claims for explicit denial
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.admin === false || tokenResult.claims.role === 'none') {
      return { isAdmin: false };
    }

    // 2. Always verify the authoritative /adminUsers/{uid} record in Firestore
    const adminSnap = await getDoc(doc(db, 'adminUsers', user.uid));

    // One-time automatic bootstrap if the verified repository owner signs in before /adminUsers/{uid} exists
    if (!adminSnap.exists() && user.email === DESIGNATED_OWNER_EMAIL && user.emailVerified) {
      try {
        await setDoc(doc(db, 'adminUsers', user.uid), {
          uid: user.uid,
          email: user.email,
          role: 'super_admin',
          revoked: false,
          grantedAt: serverTimestamp(),
        });
        return { isAdmin: true, role: 'super_admin' };
      } catch {
        return { isAdmin: false };
      }
    }

    if (!adminSnap.exists()) {
      return { isAdmin: false };
    }

    const data = adminSnap.data();
    if (data?.revoked === true) {
      return { isAdmin: false };
    }

    if (data?.role === 'admin' || data?.role === 'super_admin') {
      // Ensure token role claim (if present) does not conflict
      if (
        typeof tokenResult.claims.role === 'string' &&
        tokenResult.claims.role !== data.role
      ) {
        return { isAdmin: false };
      }
      return { isAdmin: true, role: data.role };
    }
  } catch {
    // On permission denied or network error, fail closed
    return { isAdmin: false };
  }

  return { isAdmin: false };
}

/**
 * Allows the verified project owner to claim their initial super_admin role ONCE.
 * Enforces one-time execution lock: rejects if /adminUsers/{uid} already exists.
 */
export async function bootstrapOwnerAdmin(
  user: User
): Promise<{ success: boolean; message: string }> {
  if (user.email !== DESIGNATED_OWNER_EMAIL || !user.emailVerified) {
    throw new Error(
      'Only the verified repository owner account may claim the initial admin credentials.'
    );
  }

  const adminRef = doc(db, 'adminUsers', user.uid);
  const existingSnap = await getDoc(adminRef);
  if (existingSnap.exists()) {
    throw new Error(
      'Initial super_admin bootstrap has already been completed and cannot be executed repeatedly.'
    );
  }

  try {
    const callable = httpsCallable(functions, 'adminBootstrapInitialAdmin');
    const res: any = await callable();
    await user.getIdToken(true); // Force token refresh to pick up custom claims
    return {
      success: true,
      message: res.data?.message || 'Admin credentials established successfully.',
    };
  } catch (err: any) {
    if (err?.code === 'functions/already-exists' || err?.message?.includes('already been completed')) {
      throw new Error('Initial super_admin bootstrap has already been completed.');
    }

    // One-time Firestore rule-guarded create when Cloud Functions are not yet deployed
    await setDoc(adminRef, {
      uid: user.uid,
      email: user.email,
      role: 'super_admin',
      revoked: false,
      grantedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: 'One-time owner super_admin credentials recorded in /adminUsers.',
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
    const displayName = (
      user.displayName?.trim() ||
      user.email?.split('@')[0]?.trim() ||
      'Heritage Patron'
    ).slice(0, 100);
    const email = (user.email || '').trim().slice(0, 160);
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
      const safeDisplayName = (
        typeof existingData.displayName === 'string' && existingData.displayName.trim().length > 0
          ? existingData.displayName.trim()
          : displayName
      ).slice(0, 100);
      const safeEmail = (
        typeof existingData.email === 'string' && existingData.email.trim().length > 0
          ? existingData.email.trim()
          : email
      ).slice(0, 160);
      const safeLang: 'en' | 'bn' =
        existingData.preferredLanguage === 'bn' || existingData.preferredLanguage === 'en'
          ? existingData.preferredLanguage
          : normalizedLang;
      const safeCreatedAt =
        existingData.createdAt instanceof Timestamp
          ? existingData.createdAt
          : serverTimestamp();

      await setDoc(userRef, {
        uid: user.uid,
        displayName: safeDisplayName,
        email: safeEmail,
        role: 'customer',
        preferredLanguage: safeLang,
        createdAt: safeCreatedAt,
        updatedAt: serverTimestamp(),
      });
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
      role: adminCheck.isAdmin ? adminCheck.role || 'admin' : 'customer',
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
    await setDoc(privateRef, {
      uid,
      phone: (contact.phone || '').replace(/[\s-]/g, ''),
      defaultAddress: (contact.defaultAddress || '').trim().slice(0, 500),
      district: (contact.district || '').trim().slice(0, 80),
      thana: (contact.thana || '').trim().slice(0, 80),
      postalCode: (contact.postalCode || '').trim().slice(0, 20),
      updatedAt: serverTimestamp(),
    });
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

/**
 * Subscribes to both authentication state changes AND ID token refreshes/expirations
 * so role revocations or token updates trigger immediate re-verification.
 */
export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onIdTokenChanged(auth, callback);
}
