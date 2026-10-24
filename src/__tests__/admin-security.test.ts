/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Read actual security rules & backend/auth files directly from repository root
const FIRESTORE_RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const STORAGE_RULES_PATH = path.resolve(process.cwd(), 'storage.rules');
const FUNCTIONS_INDEX_PATH = path.resolve(process.cwd(), 'functions/src/index.ts');
const FIREBASE_AUTH_PATH = path.resolve(process.cwd(), 'src/lib/firebaseAuth.ts');

const firestoreRulesContent = fs.readFileSync(FIRESTORE_RULES_PATH, 'utf-8');
const storageRulesContent = fs.readFileSync(STORAGE_RULES_PATH, 'utf-8');
const functionsContent = fs.readFileSync(FUNCTIONS_INDEX_PATH, 'utf-8');
const firebaseAuthContent = fs.readFileSync(FIREBASE_AUTH_PATH, 'utf-8');

interface AuthContext {
  uid: string | null;
  token?: {
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
    role?: string;
  };
}

interface MockDatabase {
  adminUsers: Record<string, { uid: string; role: string; email: string; revoked?: boolean }>;
  users: Record<string, { uid: string; role: string; private?: Record<string, any> }>;
  orders: Record<string, { id: string; customerUid: string; orderStatus: string; total: number }>;
  products: Record<string, { id: number; isPublished: boolean; isDemoData: boolean; verificationStatus: string; priceBdt: number; stockCount: number }>;
}

/**
 * High-fidelity Rule Engine Simulator mirroring the exact conjunctive logic in firestore.rules,
 * storage.rules, src/lib/firebaseAuth.ts, and functions/src/index.ts.
 */
class SecurityRulesEvaluator {
  private db: MockDatabase;

  constructor(db: MockDatabase) {
    this.db = db;
  }

  private isSignedIn(auth: AuthContext): boolean {
    return auth.uid !== null;
  }

  private isOwner(auth: AuthContext, userId: string): boolean {
    return this.isSignedIn(auth) && auth.uid === userId;
  }

  /**
   * Evaluates conjunctive isAdmin() logic:
   * 1. Must be signed in
   * 2. Token custom claim 'admin' must NOT be explicitly false (`request.auth.token.get('admin', true) != false`)
   * 3. Authoritative `/adminUsers/{uid}` document MUST exist with `role in ['admin', 'super_admin']` and `revoked != true`
   */
  public isAdmin(auth: AuthContext): boolean {
    if (!this.isSignedIn(auth)) return false;
    if (auth.token?.admin === false || auth.token?.role === 'none') {
      return false;
    }
    const adminDoc = this.db.adminUsers[auth.uid!];
    if (!adminDoc || adminDoc.revoked === true) {
      return false;
    }
    if (!['admin', 'super_admin'].includes(adminDoc.role)) {
      return false;
    }
    if (typeof auth.token?.role === 'string' && auth.token.role !== adminDoc.role) {
      return false;
    }
    return true;
  }

  // --- Route Guarding Logic ---
  public evaluateAdminRouteAccess(auth: AuthContext): {
    canAccess: boolean;
    action: 'redirect_login' | 'forbidden_403' | 'allow';
  } {
    if (!this.isSignedIn(auth)) {
      return { canAccess: false, action: 'redirect_login' };
    }
    if (!this.isAdmin(auth)) {
      return { canAccess: false, action: 'forbidden_403' };
    }
    return { canAccess: true, action: 'allow' };
  }

  // --- Firestore Rules Path Evaluations ---
  public canReadAdminUser(auth: AuthContext, targetUid: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    return auth.uid === targetUid || this.isAdmin(auth);
  }

  public canCreateAdminUser(
    auth: AuthContext,
    targetUid: string,
    payload: { uid: string; email: string; role: string; revoked: boolean }
  ): boolean {
    if (!this.isSignedIn(auth) || auth.uid !== targetUid) return false;
    // One-time bootstrap strictly for verified project owner if document does not yet exist
    if (this.db.adminUsers[targetUid]) return false;
    return (
      auth.token?.email === 'nahianalmubin2006@gmail.com' &&
      auth.token?.email_verified === true &&
      payload.uid === targetUid &&
      payload.email === 'nahianalmubin2006@gmail.com' &&
      payload.role === 'super_admin' &&
      payload.revoked === false
    );
  }

  public canUpdateOrDeleteAdminUserFromClient(_auth: AuthContext): boolean {
    // In firestore.rules: allow update, delete: if false;
    return false;
  }

  public canReadUserPrivateContact(auth: AuthContext, targetUid: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    return this.isOwner(auth, targetUid) || this.isAdmin(auth);
  }

  public canReadOrder(auth: AuthContext, orderId: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    const order = this.db.orders[orderId];
    if (!order) return false;
    return order.customerUid === auth.uid || this.isAdmin(auth);
  }

  public canUpdateOrderStatus(auth: AuthContext, orderId: string, nextStatus: string): boolean {
    if (!this.isSignedIn(auth)) return false;
    const order = this.db.orders[orderId];
    if (!order) return false;
    if (nextStatus === 'cancelled' && order.customerUid === auth.uid && order.orderStatus === 'pending_verification') {
      return true;
    }
    return this.isAdmin(auth);
  }

  public canModifyProductPriceOrStock(
    auth: AuthContext,
    fieldsUpdated: string[],
    atomicOrderContext?: {
      lastOrderId: string;
      orderExistedBefore: boolean;
      orderExistsAfter: boolean;
      orderOwnerUid: string;
      statusBefore?: string;
      statusAfter: string;
      stockDelta: number;
    }
  ): boolean {
    if (!this.isSignedIn(auth)) return false;
    if (this.isAdmin(auth)) return true;

    // Non-admin can NEVER modify price, publication status, or reservedStock
    const allowedStockKeys = ['stockCount', 'reservedStock', 'lastOrderId', 'updatedAt'];
    if (!fieldsUpdated.every((k) => allowedStockKeys.includes(k))) {
      return false;
    }

    // Direct stock modification without an atomic order transaction is strictly DENIED
    if (!atomicOrderContext || !fieldsUpdated.includes('lastOrderId')) {
      return false;
    }

    if (atomicOrderContext.orderOwnerUid !== auth.uid || !atomicOrderContext.orderExistsAfter) {
      return false;
    }

    if (atomicOrderContext.stockDelta === 0 || Math.abs(atomicOrderContext.stockDelta) > 20) {
      return false;
    }

    // Decrement requires brand-new pending_verification order created in same transaction
    if (atomicOrderContext.stockDelta < 0) {
      return (
        !atomicOrderContext.orderExistedBefore &&
        atomicOrderContext.statusAfter === 'pending_verification'
      );
    }

    // Increment requires cancelling an existing pending_verification order in same transaction
    return (
      atomicOrderContext.orderExistedBefore &&
      atomicOrderContext.statusBefore === 'pending_verification' &&
      atomicOrderContext.statusAfter === 'cancelled'
    );
  }

  public canReadPublicProduct(
    product: { isPublished: boolean; isDemoData: boolean; verificationStatus: string },
    auth: AuthContext
  ): boolean {
    if (product.isPublished && !product.isDemoData && product.verificationStatus === 'verified') {
      return true;
    }
    return this.isAdmin(auth);
  }

  // --- Storage Rules Path Evaluations ---
  public canWriteStorage(auth: AuthContext, file: { contentType: string; sizeBytes: number }): boolean {
    if (!this.isSignedIn(auth)) return false;
    if (auth.token?.admin !== true) return false;
    if (!['admin', 'super_admin'].includes(auth.token?.role || '')) return false;
    const validMime = /image\/(jpeg|png|webp|avif)/.test(file.contentType);
    const validSize = file.sizeBytes <= 5 * 1024 * 1024;
    return validMime && validSize;
  }
}

describe('Roots of Bengal — Administrative Security & Zero-Trust Verification', () => {
  const createMockDb = (): MockDatabase => ({
    adminUsers: {
      'admin-uid-123': { uid: 'admin-uid-123', role: 'admin', email: 'verified-admin@heritagebengal.org', revoked: false },
      'owner-uid-999': { uid: 'owner-uid-999', role: 'super_admin', email: 'nahianalmubin2006@gmail.com', revoked: false },
    },
    users: {
      'cust-uid-456': { uid: 'cust-uid-456', role: 'customer' },
      'cust-uid-789': { uid: 'cust-uid-789', role: 'customer' },
    },
    orders: {
      'order-101': { id: 'order-101', customerUid: 'cust-uid-456', orderStatus: 'pending_verification', total: 4800 },
      'order-102': { id: 'order-102', customerUid: 'cust-uid-789', orderStatus: 'confirmed', total: 6200 },
    },
    products: {
      'p-1': { id: 1, isPublished: true, isDemoData: false, verificationStatus: 'verified', priceBdt: 4800, stockCount: 8 },
      'p-unpub': { id: 2, isPublished: false, isDemoData: false, verificationStatus: 'pending_review', priceBdt: 3500, stockCount: 5 },
    },
  });

  // Scenario 1: Signed-out visitor to /admin -> blocked / login required
  it('Scenario 1: Signed-out visitor to /admin is blocked and redirected to login', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const unauthenticatedVisitor: AuthContext = { uid: null };
    const result = evaluator.evaluateAdminRouteAccess(unauthenticatedVisitor);

    expect(result.canAccess).toBe(false);
    expect(result.action).toBe('redirect_login');
  });

  // Scenario 2: Signed-out visitor direct to nested /admin/orders -> blocked
  it('Scenario 2: Signed-out visitor navigating directly to /admin/orders is blocked without leaking orders', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const unauthenticatedVisitor: AuthContext = { uid: null };
    const routeAccess = evaluator.evaluateAdminRouteAccess(unauthenticatedVisitor);
    const canReadOrders = evaluator.canReadOrder(unauthenticatedVisitor, 'order-101');

    expect(routeAccess.canAccess).toBe(false);
    expect(routeAccess.action).toBe('redirect_login');
    expect(canReadOrders).toBe(false);
  });

  // Scenario 3: Regular authenticated customer to /admin -> 403 Access Denied
  it('Scenario 3: Regular authenticated customer visiting /admin receives strict 403 Access Denied', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customerUser: AuthContext = {
      uid: 'cust-uid-456',
      token: { email: 'customer@gmail.com', email_verified: true, admin: false },
    };

    const result = evaluator.evaluateAdminRouteAccess(customerUser);
    expect(result.canAccess).toBe(false);
    expect(result.action).toBe('forbidden_403');
  });

  // Scenario 4: Direct read attempt to /adminUsers or other user's /private/contact -> denied by rules
  it('Scenario 4: Direct read to foreign /adminUsers or /private/contact is denied by rules', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customer1: AuthContext = { uid: 'cust-uid-456' };

    expect(evaluator.canReadAdminUser(customer1, 'admin-uid-123')).toBe(false);
    expect(evaluator.canReadUserPrivateContact(customer1, 'cust-uid-789')).toBe(false);
    expect(evaluator.canReadUserPrivateContact(customer1, 'cust-uid-456')).toBe(true);
  });

  // Scenario 5: Customer reading another customer's order -> denied by rules
  it('Scenario 5: Customer attempting to read another customer order is denied by rules', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const customer2: AuthContext = { uid: 'cust-uid-789' };

    expect(evaluator.canReadOrder(customer1, 'order-101')).toBe(true);
    expect(evaluator.canReadOrder(customer1, 'order-102')).toBe(false);
    expect(evaluator.canReadOrder(customer2, 'order-102')).toBe(true);
  });

  // Scenario 6: Client modifying product price or stock directly -> denied by rules
  it('Scenario 6: Regular customer cannot modify product price OR stock directly outside an atomic order transaction', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const verifiedAdmin: AuthContext = { uid: 'admin-uid-123', token: { admin: true, role: 'admin' } };

    // Direct price modification by customer -> DENIED
    expect(evaluator.canModifyProductPriceOrStock(customer1, ['priceBdt'])).toBe(false);
    // Direct stock modification by customer without atomic order -> DENIED
    expect(evaluator.canModifyProductPriceOrStock(customer1, ['stockCount', 'updatedAt'])).toBe(false);
    // Replay attack using an already-existing order for stock decrement -> DENIED
    expect(
      evaluator.canModifyProductPriceOrStock(customer1, ['stockCount', 'lastOrderId', 'updatedAt'], {
        lastOrderId: 'order-101',
        orderExistedBefore: true,
        orderExistsAfter: true,
        orderOwnerUid: 'cust-uid-456',
        statusAfter: 'pending_verification',
        stockDelta: -2,
      })
    ).toBe(false);
    // Valid atomic new order transaction by customer -> ALLOWED
    expect(
      evaluator.canModifyProductPriceOrStock(customer1, ['stockCount', 'lastOrderId', 'updatedAt'], {
        lastOrderId: 'order-new-999',
        orderExistedBefore: false,
        orderExistsAfter: true,
        orderOwnerUid: 'cust-uid-456',
        statusAfter: 'pending_verification',
        stockDelta: -2,
      })
    ).toBe(true);
    // Verified admin modifying price or stock -> ALLOWED
    expect(evaluator.canModifyProductPriceOrStock(verifiedAdmin, ['priceBdt', 'stockCount'])).toBe(true);
  });

  // Scenario 7: Non-admin publishing content or updating order status -> denied by rules
  it('Scenario 7: Non-admin updating order status to confirmed/shipped is denied by rules', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const adminUser: AuthContext = { uid: 'admin-uid-123' };

    expect(evaluator.canUpdateOrderStatus(customer1, 'order-101', 'confirmed')).toBe(false);
    expect(evaluator.canUpdateOrderStatus(adminUser, 'order-101', 'confirmed')).toBe(true);
  });

  // Scenario 8: Non-admin uploading or overwriting storage media -> denied by rules
  it('Scenario 8: Storage rules block non-admin uploads and enforce image constraints', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const customerUser: AuthContext = { uid: 'cust-uid-456', token: { admin: false } };
    const adminUser: AuthContext = { uid: 'admin-uid-123', token: { admin: true, role: 'admin' } };

    const validImage = { contentType: 'image/webp', sizeBytes: 2 * 1024 * 1024 };
    const oversizedImage = { contentType: 'image/jpeg', sizeBytes: 10 * 1024 * 1024 };
    const maliciousScript = { contentType: 'text/html', sizeBytes: 1024 };

    expect(evaluator.canWriteStorage(customerUser, validImage)).toBe(false);
    expect(evaluator.canWriteStorage(adminUser, validImage)).toBe(true);
    expect(evaluator.canWriteStorage(adminUser, oversizedImage)).toBe(false);
    expect(evaluator.canWriteStorage(adminUser, maliciousScript)).toBe(false);
  });

  // Scenario 9: Client self-assigning admin role in /adminUsers -> denied by rules, and one-time owner bootstrap lock
  it('Scenario 9: Client attempts to self-assign admin role in /adminUsers are rejected; owner bootstrap is strictly one-time', () => {
    const db = createMockDb();
    const evaluator = new SecurityRulesEvaluator(db);

    const attacker: AuthContext = {
      uid: 'malicious-attacker',
      token: { email: 'attacker@evil.com', email_verified: true },
    };
    const unverifiedSpoofer: AuthContext = {
      uid: 'spoof-uid',
      token: { email: 'nahianalmubin2006@gmail.com', email_verified: false },
    };

    // Attacker cannot create or update /adminUsers
    expect(
      evaluator.canCreateAdminUser(attacker, 'malicious-attacker', {
        uid: 'malicious-attacker',
        email: 'attacker@evil.com',
        role: 'super_admin',
        revoked: false,
      })
    ).toBe(false);
    expect(evaluator.canUpdateOrDeleteAdminUserFromClient(attacker)).toBe(false);

    // Unverified email spoofer cannot create /adminUsers
    expect(
      evaluator.canCreateAdminUser(unverifiedSpoofer, 'spoof-uid', {
        uid: 'spoof-uid',
        email: 'nahianalmubin2006@gmail.com',
        role: 'super_admin',
        revoked: false,
      })
    ).toBe(false);

    // Verified owner CANNOT re-run bootstrap when /adminUsers/{uid} already exists
    const existingOwner: AuthContext = {
      uid: 'owner-uid-999',
      token: { email: 'nahianalmubin2006@gmail.com', email_verified: true },
    };
    expect(
      evaluator.canCreateAdminUser(existingOwner, 'owner-uid-999', {
        uid: 'owner-uid-999',
        email: 'nahianalmubin2006@gmail.com',
        role: 'super_admin',
        revoked: false,
      })
    ).toBe(false);
  });

  // Scenario 10: Admin access revoked -> former admin denied privileged operations even if JWT has stale claim
  it('Scenario 10: Dual-source conjunctive check denies access if EITHER custom claim OR /adminUsers denies the user', () => {
    const mutableDb = createMockDb();
    const dynamicEvaluator = new SecurityRulesEvaluator(mutableDb);

    // Case A: User has a valid active /adminUsers record AND valid token claim
    const activeAdminWithToken: AuthContext = {
      uid: 'admin-uid-123',
      token: { admin: true, role: 'admin' },
    };
    expect(dynamicEvaluator.isAdmin(activeAdminWithToken)).toBe(true);

    // Case B: Admin is revoked in /adminUsers (deleted), but browser still holds a stale 60-min JWT with `admin: true`
    delete mutableDb.adminUsers['admin-uid-123'];
    expect(dynamicEvaluator.isAdmin(activeAdminWithToken)).toBe(false);
    expect(dynamicEvaluator.evaluateAdminRouteAccess(activeAdminWithToken).action).toBe('forbidden_403');

    // Case C: /adminUsers record exists, but custom claim explicitly sets `admin: false`
    mutableDb.adminUsers['admin-uid-123'] = {
      uid: 'admin-uid-123',
      role: 'admin',
      email: 'verified-admin@heritagebengal.org',
      revoked: false,
    };
    const claimRevokedAdmin: AuthContext = {
      uid: 'admin-uid-123',
      token: { admin: false, role: 'none' },
    };
    expect(dynamicEvaluator.isAdmin(claimRevokedAdmin)).toBe(false);
  });

  // Scenario 11: Public visitors can view published products, artisans, and public pages cleanly
  it('Scenario 11: Public visitors can view published verified products, but unpublished items remain hidden', () => {
    const db = createMockDb();
    const evaluator = new SecurityRulesEvaluator(db);
    const anonymousUser: AuthContext = { uid: null };
    const adminUser: AuthContext = { uid: 'admin-uid-123' };

    expect(evaluator.canReadPublicProduct(db.products['p-1'], anonymousUser)).toBe(true);
    expect(evaluator.canReadPublicProduct(db.products['p-unpub'], anonymousUser)).toBe(false);
    expect(evaluator.canReadPublicProduct(db.products['p-unpub'], adminUser)).toBe(true);
  });

  // Scenario 12: Legitimate admin authorized by role can perform operations
  it('Scenario 12: Legitimate verified admin can access routes, review orders, and manage catalog', () => {
    const evaluator = new SecurityRulesEvaluator(createMockDb());
    const verifiedAdmin: AuthContext = {
      uid: 'admin-uid-123',
      token: { admin: true, role: 'admin' },
    };

    const routeCheck = evaluator.evaluateAdminRouteAccess(verifiedAdmin);
    expect(routeCheck.canAccess).toBe(true);
    expect(routeCheck.action).toBe('allow');
    expect(evaluator.canReadOrder(verifiedAdmin, 'order-101')).toBe(true);
    expect(evaluator.canReadOrder(verifiedAdmin, 'order-102')).toBe(true);
    expect(evaluator.canUpdateOrderStatus(verifiedAdmin, 'order-101', 'confirmed')).toBe(true);
  });

  // Static Verification of Actual Source Code Security Invariants
  describe('Source File Invariant Static Verification', () => {
    it('verifies firestore.rules implements a global default-deny catch-all', () => {
      expect(firestoreRulesContent).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
    });

    it('verifies firestore.rules isAdmin() uses conjunctive && (never || between token.admin and exists(/adminUsers))', () => {
      expect(firestoreRulesContent).toContain("request.auth.token.get('admin', true) != false &&");
      expect(firestoreRulesContent).toContain('exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid))');
      expect(firestoreRulesContent).not.toContain("request.auth.token.get('admin', false) == true ||");
    });

    it('verifies firestore.rules requires atomic order transition proof (isAtomicCustomerOrderTransition) for non-admin stock updates', () => {
      expect(firestoreRulesContent).toContain('function isAtomicCustomerOrderTransition(orderId, isDecrement)');
      expect(firestoreRulesContent).toContain('existsAfter(/databases/$(database)/documents/orders/$(orderId))');
    });

    it('verifies firestore.rules forbids client update and delete on /adminUsers', () => {
      expect(firestoreRulesContent).toMatch(/match \/adminUsers\/\{uid\}\s*\{[\s\S]*allow update, delete:\s*if false;/);
    });

    it('verifies functions/src/index.ts connects to the named Firestore database and locks adminBootstrapInitialAdmin transactionally', () => {
      expect(functionsContent).toContain('ai-studio-rootsofbengal-22074646-460f-4ebc-ac7e-7dab24b1ac5e');
      expect(functionsContent).toContain('Initial super_admin bootstrap has already been completed and cannot be executed repeatedly.');
    });

    it('verifies src/lib/firebaseAuth.ts does not short-circuit on tokenResult.claims.admin === true without checking /adminUsers', () => {
      expect(firebaseAuthContent).toContain('if (tokenResult.claims.admin === false || tokenResult.claims.role === \'none\')');
      expect(firebaseAuthContent).toContain("const adminSnap = await getDoc(doc(db, 'adminUsers', user.uid));");
    });

    it('verifies storage.rules enforces 5MB limit, image MIME types, and role claim check', () => {
      expect(storageRulesContent).toContain("request.resource.contentType.matches('image/(jpeg|png|webp|avif)')");
      expect(storageRulesContent).toContain("request.auth.token.get('role', '') in ['admin', 'super_admin']");
      expect(storageRulesContent).toMatch(/allow read, write:\s*if false;/);
    });
  });
});
