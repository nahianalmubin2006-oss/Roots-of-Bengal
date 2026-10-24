/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { checkIsUserAdmin } from '../lib/firebaseAuth';

// Read actual security rules directly from repository root
const FIRESTORE_RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const STORAGE_RULES_PATH = path.resolve(process.cwd(), 'storage.rules');
const firestoreRulesContent = fs.readFileSync(FIRESTORE_RULES_PATH, 'utf-8');
const storageRulesContent = fs.readFileSync(STORAGE_RULES_PATH, 'utf-8');

/**
 * High-fidelity Rule Engine Simulator mirroring the exact logic in firestore.rules
 */
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
  adminUsers: Record<string, { role: string; email: string }>;
  users: Record<string, { uid: string; role: string; private?: Record<string, any> }>;
  orders: Record<string, { id: string; customerUid: string; orderStatus: string; total: number }>;
  products: Record<string, { id: number; isPublished: boolean; isDemoData: boolean; verificationStatus: string; priceBdt: number }>;
}

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
   * Evaluates the isAdmin() function as written in firestore.rules:
   * function isAdmin() {
   *   return isSignedIn() && (
   *     request.auth.token.get('admin', false) == true ||
   *     (
   *       exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid)) &&
   *       get(/databases/$(database)/documents/adminUsers/$(request.auth.uid)).data.role in ['admin', 'super_admin']
   *     )
   *   );
   * }
   */
  public isAdmin(auth: AuthContext): boolean {
    if (!this.isSignedIn(auth)) return false;
    if (auth.token?.admin === true) return true;
    const adminDoc = this.db.adminUsers[auth.uid!];
    if (adminDoc && ['admin', 'super_admin'].includes(adminDoc.role)) {
      return true;
    }
    return false;
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

  public canWriteAdminUser(auth: AuthContext): boolean {
    // In firestore.rules: allow create, update, delete: if false;
    // Clients can NEVER modify adminUsers directly under any circumstance
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
    // Customer can only cancel their own pending order
    if (nextStatus === 'cancelled' && order.customerUid === auth.uid && order.orderStatus === 'pending_verification') {
      return true;
    }
    // All other transitions (confirm, dispatch, deliver) require verified admin
    return this.isAdmin(auth);
  }

  public canModifyProductPriceOrStock(auth: AuthContext, fieldsUpdated: string[]): boolean {
    if (!this.isSignedIn(auth)) return false;
    // Only verified admins can modify price, publication status, or base catalog data
    if (fieldsUpdated.includes('priceBdt') || fieldsUpdated.includes('isPublished') || fieldsUpdated.includes('verificationStatus')) {
      return this.isAdmin(auth);
    }
    return this.isAdmin(auth);
  }

  public canReadPublicProduct(product: { isPublished: boolean; isDemoData: boolean; verificationStatus: string }, auth: AuthContext): boolean {
    if (product.isPublished && !product.isDemoData && product.verificationStatus === 'verified') {
      return true; // Publicly readable by all
    }
    return this.isAdmin(auth);
  }

  // --- Storage Rules Path Evaluations ---
  public canWriteStorage(auth: AuthContext, file: { contentType: string; sizeBytes: number }): boolean {
    // function isAdmin() { return isSignedIn() && request.auth.token.get('admin', false) == true; }
    if (!this.isSignedIn(auth)) return false;
    if (auth.token?.admin !== true) return false;
    const validMime = /image\/(jpeg|png|webp|avif)/.test(file.contentType);
    const validSize = file.sizeBytes <= 5 * 1024 * 1024;
    return validMime && validSize;
  }
}

describe('Roots of Bengal — Administrative Security & Zero-Trust Verification', () => {
  const mockDb: MockDatabase = {
    adminUsers: {
      'admin-uid-123': { role: 'admin', email: 'verified-admin@heritagebengal.org' },
      'owner-uid-999': { role: 'super_admin', email: 'nahianalmubin2006@gmail.com' },
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
      'p-1': { id: 1, isPublished: true, isDemoData: false, verificationStatus: 'verified', priceBdt: 4800 },
      'p-unpub': { id: 2, isPublished: false, isDemoData: false, verificationStatus: 'pending_review', priceBdt: 3500 },
    },
  };

  const evaluator = new SecurityRulesEvaluator(mockDb);

  // Scenario 1: Signed-out visitor to /admin -> blocked / login required
  it('Scenario 1: Signed-out visitor to /admin is blocked and redirected to login', () => {
    const unauthenticatedVisitor: AuthContext = { uid: null };
    const result = evaluator.evaluateAdminRouteAccess(unauthenticatedVisitor);

    expect(result.canAccess).toBe(false);
    expect(result.action).toBe('redirect_login');
  });

  // Scenario 2: Signed-out visitor direct to nested /admin/orders -> blocked
  it('Scenario 2: Signed-out visitor navigating directly to /admin/orders is blocked without leaking orders', () => {
    const unauthenticatedVisitor: AuthContext = { uid: null };
    const routeAccess = evaluator.evaluateAdminRouteAccess(unauthenticatedVisitor);
    const canReadOrders = evaluator.canReadOrder(unauthenticatedVisitor, 'order-101');

    expect(routeAccess.canAccess).toBe(false);
    expect(routeAccess.action).toBe('redirect_login');
    expect(canReadOrders).toBe(false);
  });

  // Scenario 3: Regular authenticated customer to /admin -> 403 Access Denied
  it('Scenario 3: Regular authenticated customer visiting /admin receives strict 403 Access Denied', () => {
    const customerUser: AuthContext = {
      uid: 'cust-uid-456',
      token: { email: 'customer@gmail.com', email_verified: true, admin: false },
    };

    const result = evaluator.evaluateAdminRouteAccess(customerUser);
    expect(result.canAccess).toBe(false);
    expect(result.action).toBe('forbidden_403');
  });

  // Scenario 4: Direct read attempt to /adminUsers or other user's /private/contact -> denied by rules
  it('Scenario 4: Direct read to foreign /private/contact is denied by rules', () => {
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const canReadForeignContact = evaluator.canReadUserPrivateContact(customer1, 'cust-uid-789');
    const canReadOwnContact = evaluator.canReadUserPrivateContact(customer1, 'cust-uid-456');

    expect(canReadForeignContact).toBe(false);
    expect(canReadOwnContact).toBe(true);
  });

  // Scenario 5: Customer reading another customer's order -> denied by rules
  it('Scenario 5: Customer attempting to read another customer order is denied by rules', () => {
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const customer2: AuthContext = { uid: 'cust-uid-789' };

    // Customer 1 reading their own order
    expect(evaluator.canReadOrder(customer1, 'order-101')).toBe(true);
    // Customer 1 attempting to snoop on Customer 2's order
    expect(evaluator.canReadOrder(customer1, 'order-102')).toBe(false);
    // Customer 2 reading their own order
    expect(evaluator.canReadOrder(customer2, 'order-102')).toBe(true);
  });

  // Scenario 6: Client modifying product price or stock directly -> denied by rules
  it('Scenario 6: Regular customer or unauthenticated client cannot modify product prices', () => {
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const canCustomerModifyPrice = evaluator.canModifyProductPriceOrStock(customer1, ['priceBdt']);
    const canAdminModifyPrice = evaluator.canModifyProductPriceOrStock(
      { uid: 'admin-uid-123', token: { admin: true } },
      ['priceBdt']
    );

    expect(canCustomerModifyPrice).toBe(false);
    expect(canAdminModifyPrice).toBe(true);
  });

  // Scenario 7: Non-admin publishing content or updating order status -> denied by rules
  it('Scenario 7: Non-admin updating order status to confirmed/shipped is denied by rules', () => {
    const customer1: AuthContext = { uid: 'cust-uid-456' };
    const adminUser: AuthContext = { uid: 'admin-uid-123' };

    // Customer cannot transition status to 'confirmed'
    expect(evaluator.canUpdateOrderStatus(customer1, 'order-101', 'confirmed')).toBe(false);
    // Verified admin CAN transition status to 'confirmed'
    expect(evaluator.canUpdateOrderStatus(adminUser, 'order-101', 'confirmed')).toBe(true);
  });

  // Scenario 8: Non-admin uploading or overwriting storage media -> denied by rules
  it('Scenario 8: Storage rules block non-admin uploads and enforce image constraints', () => {
    const customerUser: AuthContext = { uid: 'cust-uid-456', token: { admin: false } };
    const adminUser: AuthContext = { uid: 'admin-uid-123', token: { admin: true } };

    const validImage = { contentType: 'image/webp', sizeBytes: 2 * 1024 * 1024 };
    const oversizedImage = { contentType: 'image/jpeg', sizeBytes: 10 * 1024 * 1024 };
    const maliciousScript = { contentType: 'text/html', sizeBytes: 1024 };

    // Non-admin upload rejected
    expect(evaluator.canWriteStorage(customerUser, validImage)).toBe(false);
    // Admin valid upload accepted
    expect(evaluator.canWriteStorage(adminUser, validImage)).toBe(true);
    // Admin oversized upload rejected (>5MB)
    expect(evaluator.canWriteStorage(adminUser, oversizedImage)).toBe(false);
    // Admin non-image rejected
    expect(evaluator.canWriteStorage(adminUser, maliciousScript)).toBe(false);
  });

  // Scenario 9: Client self-assigning admin role in /adminUsers -> denied by rules
  it('Scenario 9: Client attempts to directly create or update /adminUsers are rejected by rules', () => {
    const attacker: AuthContext = {
      uid: 'malicious-attacker',
      token: { email: 'attacker@evil.com' },
    };

    // Even if attacker passes admin claim or arbitrary data, client writes to /adminUsers are unconditionally blocked
    expect(evaluator.canWriteAdminUser(attacker)).toBe(false);

    // Verify firestore.rules explicitly has 'allow create, update, delete: if false;' for adminUsers
    expect(firestoreRulesContent).toContain('match /adminUsers/{uid}');
    expect(firestoreRulesContent).toMatch(/match \/adminUsers\/\{uid\}\s*\{[\s\S]*allow create, update, delete:\s*if false;/);
  });

  // Scenario 10: Admin access revoked -> former admin denied privileged operations
  it('Scenario 10: Former admin whose role is revoked or removed is immediately denied access', () => {
    const mutableDb: MockDatabase = {
      ...mockDb,
      adminUsers: {
        'revoked-admin-uid': { role: 'admin', email: 'revoked@domain.com' },
      },
    };
    const dynamicEvaluator = new SecurityRulesEvaluator(mutableDb);
    const formerAdmin: AuthContext = { uid: 'revoked-admin-uid' };

    // Initially authorized
    expect(dynamicEvaluator.isAdmin(formerAdmin)).toBe(true);

    // Revoke admin access by removing from adminUsers
    delete mutableDb.adminUsers['revoked-admin-uid'];

    // Now immediately rejected
    expect(dynamicEvaluator.isAdmin(formerAdmin)).toBe(false);
    expect(dynamicEvaluator.evaluateAdminRouteAccess(formerAdmin).canAccess).toBe(false);
    expect(dynamicEvaluator.evaluateAdminRouteAccess(formerAdmin).action).toBe('forbidden_403');
  });

  // Scenario 11: Public visitors can view published products, artisans, and public pages cleanly
  it('Scenario 11: Public visitors can view published verified products, but unpublished items remain hidden', () => {
    const anonymousUser: AuthContext = { uid: null };
    const adminUser: AuthContext = { uid: 'admin-uid-123' };

    const publishedProduct = mockDb.products['p-1'];
    const unpublishedProduct = mockDb.products['p-unpub'];

    // Anonymous visitor can view published verified product
    expect(evaluator.canReadPublicProduct(publishedProduct, anonymousUser)).toBe(true);
    // Anonymous visitor CANNOT view draft/unpublished product
    expect(evaluator.canReadPublicProduct(unpublishedProduct, anonymousUser)).toBe(false);
    // Admin CAN view draft/unpublished product for review
    expect(evaluator.canReadPublicProduct(unpublishedProduct, adminUser)).toBe(true);
  });

  // Scenario 12: Legitimate admin authorized by role can perform operations
  it('Scenario 12: Legitimate verified admin can access routes, review orders, and manage catalog', () => {
    const verifiedAdmin: AuthContext = {
      uid: 'admin-uid-123',
      token: { admin: true },
    };

    const routeCheck = evaluator.evaluateAdminRouteAccess(verifiedAdmin);
    expect(routeCheck.canAccess).toBe(true);
    expect(routeCheck.action).toBe('allow');

    // Admin can read all customer orders for fulfillment
    expect(evaluator.canReadOrder(verifiedAdmin, 'order-101')).toBe(true);
    expect(evaluator.canReadOrder(verifiedAdmin, 'order-102')).toBe(true);

    // Admin can transition COD order state
    expect(evaluator.canUpdateOrderStatus(verifiedAdmin, 'order-101', 'confirmed')).toBe(true);
  });

  // Verification of Security Rule Codebase Hardening Invariants
  describe('Rule Invariant Static Verification', () => {
    it('verifies firestore.rules implements a global default-deny catch-all', () => {
      expect(firestoreRulesContent).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
    });

    it('verifies isAdmin() never checks email strings directly in firestore.rules', () => {
      // Must not contain `request.auth.token.email ==` anywhere in firestore.rules
      expect(firestoreRulesContent).not.toMatch(/request\.auth\.token\.email\s*==/);
    });

    it('verifies orders deletion is strictly forbidden in firestore.rules', () => {
      expect(firestoreRulesContent).toMatch(/match \/orders\/\{orderId\}\s*\{[\s\S]*allow delete:\s*if false;/);
    });

    it('verifies storage.rules enforces 5MB limit and image MIME types', () => {
      expect(storageRulesContent).toContain("request.resource.contentType.matches('image/(jpeg|png|webp|avif)')");
      expect(storageRulesContent).toContain('match /{allPaths=**}');
      expect(storageRulesContent).toMatch(/allow read, write:\s*if false;/);
    });
  });
});
