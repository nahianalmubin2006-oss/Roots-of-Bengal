import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = admin.initializeApp();
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-rootsofbengal-22074646-460f-4ebc-ac7e-7dab24b1ac5e';

const db = getFirestore(app, FIRESTORE_DATABASE_ID);

export interface OrderItemInput {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
}

export interface CreateOrderInput {
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  district: string;
  thana: string;
  postalCode?: string;
  deliveryInstructions?: string;
  deliveryZone: 'dhaka_metro' | 'outside_dhaka';
  paymentMethod: 'COD';
  items: OrderItemInput[];
}

const BD_PHONE_REGEX = /^(\+?880|0)1[3-9][0-9]{8}$/;
const INITIAL_BOOTSTRAP_OWNER_EMAIL = 'nahianalmubin2006@gmail.com';

function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone.replace(/[\s-]/g, ''));
}

function generateOrderReference(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ROB-${datePart}-${randomPart}`;
}

/**
 * Zero-Trust Server-Side Admin Verification:
 * 1. Requires valid Firebase Authentication context.
 * 2. Denies immediately if custom claim explicitly revokes access (`token.admin === false`).
 * 3. Always checks the live `/adminUsers/{uid}` Firestore document to guarantee
 *    instant revocation even before a 60-minute JWT expires.
 */
async function verifyCallerIsAdmin(auth: any): Promise<{ uid: string; role: 'admin' | 'super_admin' }> {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  // If custom claim is explicitly set to false, deny immediately
  if (auth.token?.admin === false || auth.token?.role === 'none') {
    throw new HttpsError('permission-denied', 'Administrative privileges have been revoked.');
  }

  // Always verify authoritative database record in /adminUsers/{uid}
  const adminDoc = await db.collection('adminUsers').doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Unauthorized. Administrative credentials required.');
  }

  const data = adminDoc.data();
  if (data?.revoked === true || (data?.role !== 'admin' && data?.role !== 'super_admin')) {
    throw new HttpsError('permission-denied', 'Unauthorized. Administrative role is inactive or invalid.');
  }

  return { uid: auth.uid, role: data.role };
}

/**
 * Privileged Cloud Function: adminBootstrapInitialAdmin
 * Allows the designated repository/project owner to claim the initial super_admin role ONCE.
 * Enforces server-side identity verification and a strict one-time transactional lock.
 */
export const adminBootstrapInitialAdmin = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerUid = request.auth.uid;
  const callerEmail = request.auth.token.email || '';
  const emailVerified = request.auth.token.email_verified === true;

  if (callerEmail !== INITIAL_BOOTSTRAP_OWNER_EMAIL || !emailVerified) {
    throw new HttpsError(
      'permission-denied',
      'This action is strictly restricted to the verified repository owner email address.'
    );
  }

  const adminRef = db.collection('adminUsers').doc(callerUid);
  const existingSuperAdminsQuery = db
    .collection('adminUsers')
    .where('role', '==', 'super_admin')
    .limit(1);

  await db.runTransaction(async (tx) => {
    const [callerSnap, existingSupersSnap] = await Promise.all([
      tx.get(adminRef),
      tx.get(existingSuperAdminsQuery),
    ]);

    if (callerSnap.exists || !existingSupersSnap.empty) {
      throw new HttpsError(
        'already-exists',
        'Initial super_admin bootstrap has already been completed and cannot be executed repeatedly.'
      );
    }

    tx.set(adminRef, {
      uid: callerUid,
      email: callerEmail,
      role: 'super_admin',
      revoked: false,
      grantedAt: FieldValue.serverTimestamp(),
    });
  });

  // Set custom user claims via Admin SDK after transaction succeeds
  await admin.auth().setCustomUserClaims(callerUid, {
    admin: true,
    role: 'super_admin',
  });

  return {
    success: true,
    uid: callerUid,
    role: 'super_admin',
    message: 'Initial super_admin role and custom claims successfully provisioned.',
  };
});

/**
 * Privileged Cloud Function: adminSetRole
 * Allows an existing Super Admin to grant or revoke admin roles for other users.
 */
export const adminSetRole = onCall({ region: 'asia-south1' }, async (request) => {
  const caller = await verifyCallerIsAdmin(request.auth);
  if (caller.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only Super Admins can manage administrative roles.');
  }

  const { targetUid, role } = request.data || {};
  if (!targetUid || typeof targetUid !== 'string' || targetUid.length < 5 || targetUid.length > 128) {
    throw new HttpsError('invalid-argument', 'Valid targetUid is required.');
  }

  if (targetUid === caller.uid) {
    throw new HttpsError('failed-precondition', 'Super Admins cannot modify or revoke their own role.');
  }

  if (role === 'admin' || role === 'super_admin') {
    const userRecord = await admin.auth().getUser(targetUid);
    await admin.auth().setCustomUserClaims(targetUid, {
      admin: true,
      role,
    });
    await db.collection('adminUsers').doc(targetUid).set({
      uid: targetUid,
      email: userRecord.email || '',
      role,
      revoked: false,
      grantedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, targetUid, role };
  } else if (role === 'none') {
    await admin.auth().setCustomUserClaims(targetUid, {
      admin: false,
      role: 'none',
    });
    await db.collection('adminUsers').doc(targetUid).delete();
    return { success: true, targetUid, role: 'revoked' };
  } else {
    throw new HttpsError('invalid-argument', 'Role must be admin, super_admin, or none.');
  }
});

/**
 * Callable Cloud Function: createOrder
 * Performs zero-trust server-side validation, idempotency verification,
 * transactional stock decrement, integer poisha calculation, and COD status enforcement.
 */
export const createOrder = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required to place an order.');
  }

  const uid = request.auth.uid;
  const payload = request.data as CreateOrderInput;

  if (!payload || typeof payload !== 'object') {
    throw new HttpsError('invalid-argument', 'Invalid order payload.');
  }

  const {
    idempotencyKey,
    customerName,
    customerPhone,
    customerEmail = '',
    shippingAddress,
    district,
    thana,
    postalCode = '',
    deliveryInstructions = '',
    deliveryZone,
    paymentMethod,
    items,
  } = payload;

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
    throw new HttpsError('invalid-argument', 'A valid idempotencyKey is required.');
  }
  if (!customerName || customerName.trim().length < 2 || customerName.trim().length > 120) {
    throw new HttpsError('invalid-argument', 'Recipient name must be between 2 and 120 characters.');
  }
  const normalizedPhone = customerPhone ? customerPhone.replace(/[\s-]/g, '') : '';
  if (!isValidBdPhone(normalizedPhone)) {
    throw new HttpsError('invalid-argument', 'Please provide a valid Bangladesh mobile number (e.g., 017XXXXXXXX).');
  }
  if (!shippingAddress || shippingAddress.trim().length < 5 || shippingAddress.trim().length > 400) {
    throw new HttpsError('invalid-argument', 'Shipping address must be between 5 and 400 characters.');
  }
  if (!district || district.trim().length < 2 || !thana || thana.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Both District and Thana/Upazila are required.');
  }
  if (deliveryZone !== 'dhaka_metro' && deliveryZone !== 'outside_dhaka') {
    throw new HttpsError('invalid-argument', 'Invalid delivery zone.');
  }
  if (paymentMethod !== 'COD') {
    throw new HttpsError('invalid-argument', 'Only Cash on Delivery (COD) is enabled for the initial Bangladesh release.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpsError('invalid-argument', 'Order must contain between 1 and 50 items.');
  }

  const sanitizedKey = idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const orderId = `ord_${uid.slice(0, 10)}_${sanitizedKey}`;
  const orderRef = db.collection('orders').doc(orderId);

  return await db.runTransaction(async (tx) => {
    const existingOrderSnap = await tx.get(orderRef);
    if (existingOrderSnap.exists) {
      return {
        alreadyExisted: true,
        order: existingOrderSnap.data(),
      };
    }

    let subtotalBdt = 0;
    let subtotalMinorUnits = 0;
    let totalItemCount = 0;
    const validatedLineItems: Array<{
      id: string;
      productId: string;
      variantId: string;
      sku: string;
      productNameEn: string;
      variantLabelEn: string;
      quantity: number;
      unitPriceBdt: number;
      unitPriceMinorUnits: number;
      lineTotalMinorUnits: number;
      productRef: FirebaseFirestore.DocumentReference;
      variantRef: FirebaseFirestore.DocumentReference;
      nextProductStock: number;
      nextVariantStock: number;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        throw new HttpsError('invalid-argument', 'Invalid item quantity or product/variant identifier.');
      }

      const productRef = db.collection('products').doc(item.productId);
      const variantRef = productRef.collection('variants').doc(item.variantId);
      const [productSnap, variantSnap] = await Promise.all([tx.get(productRef), tx.get(variantRef)]);

      if (!productSnap.exists || !variantSnap.exists) {
        throw new HttpsError('not-found', `Product or variant (${item.productId} / ${item.variantId}) does not exist.`);
      }

      const productData = productSnap.data()!;
      const variantData = variantSnap.data()!;

      if (!productData.isPublished || productData.isDemoData || productData.verificationStatus !== 'verified') {
        throw new HttpsError(
          'failed-precondition',
          `Product "${productData.nameEn}" is a demonstration/unverified item and cannot be purchased in live mode.`
        );
      }

      const availableVariantStock = Number(variantData.stockCount ?? 0);
      const availableProductStock = Number(productData.stockCount ?? 0);

      if (!variantData.isAvailable || availableVariantStock < item.quantity || availableProductStock < item.quantity) {
        throw new HttpsError(
          'failed-precondition',
          `Insufficient stock for "${productData.nameEn} (${variantData.labelEn})". Available: ${availableVariantStock}.`
        );
      }

      const unitPriceBdt = Number(variantData.priceBdt);
      const unitPriceMinorUnits = unitPriceBdt * 100;
      const lineTotalMinorUnits = unitPriceMinorUnits * item.quantity;

      subtotalBdt += unitPriceBdt * item.quantity;
      subtotalMinorUnits += lineTotalMinorUnits;
      totalItemCount += item.quantity;

      validatedLineItems.push({
        id: `item_${i + 1}_${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
        sku: String(variantData.sku),
        productNameEn: String(productData.nameEn),
        variantLabelEn: String(variantData.labelEn),
        quantity: item.quantity,
        unitPriceBdt,
        unitPriceMinorUnits,
        lineTotalMinorUnits,
        productRef,
        variantRef,
        nextProductStock: availableProductStock - item.quantity,
        nextVariantStock: availableVariantStock - item.quantity,
      });
    }

    const shippingBdt = deliveryZone === 'dhaka_metro' ? 80 : 150;
    const shippingMinorUnits = shippingBdt * 100;
    const totalBdt = subtotalBdt + shippingBdt;
    const totalMinorUnits = subtotalMinorUnits + shippingMinorUnits;
    const now = FieldValue.serverTimestamp();
    const orderReference = generateOrderReference();

    // Decrement product and variant stock transactionally
    for (const line of validatedLineItems) {
      tx.update(line.productRef, {
        stockCount: line.nextProductStock,
        lastOrderId: orderId,
        updatedAt: now,
      });
      tx.update(line.variantRef, {
        stockCount: line.nextVariantStock,
        isAvailable: line.nextVariantStock > 0,
        lastOrderId: orderId,
        updatedAt: now,
      });
    }

    const orderDoc = {
      id: orderId,
      orderReference,
      idempotencyKey: sanitizedKey,
      customerUid: uid,
      customerName: customerName.trim(),
      customerPhone: normalizedPhone,
      customerEmail: customerEmail.trim(),
      shippingAddress: shippingAddress.trim(),
      district: district.trim(),
      thana: thana.trim(),
      postalCode: postalCode.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
      deliveryZone,
      paymentMethod: 'COD' as const,
      paymentStatus: 'unpaid_cod' as const,
      orderStatus: 'pending_verification' as const,
      subtotalMinorUnits,
      shippingMinorUnits,
      totalMinorUnits,
      subtotalBdt,
      shippingBdt,
      totalBdt,
      itemCount: totalItemCount,
      currency: 'BDT' as const,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(orderRef, orderDoc);

    for (const line of validatedLineItems) {
      const itemRef = orderRef.collection('items').doc(line.id);
      tx.set(itemRef, {
        id: line.id,
        orderId,
        customerUid: uid,
        productId: line.productId,
        variantId: line.variantId,
        sku: line.sku,
        productNameEn: line.productNameEn,
        variantLabelEn: line.variantLabelEn,
        quantity: line.quantity,
        unitPriceBdt: line.unitPriceBdt,
        unitPriceMinorUnits: line.unitPriceMinorUnits,
        lineTotalMinorUnits: line.lineTotalMinorUnits,
      });
    }

    const eventId = `evt_${orderId}_created`;
    const eventRef = db.collection('orderStatusEvents').doc(eventId);
    tx.set(eventRef, {
      id: eventId,
      orderId,
      customerUid: uid,
      previousStatus: 'none',
      newStatus: 'pending_verification',
      actorUid: uid,
      actorRole: 'customer',
      note: 'Cash on Delivery (COD) order submitted and awaiting phone verification.',
      createdAt: now,
    });

    return {
      alreadyExisted: false,
      order: orderDoc,
    };
  });
});

/**
 * Callable Cloud Function: cancelOrder
 * Allows customer to cancel an order only while in `pending_verification`,
 * restoring variant and product stock transactionally.
 */
export const cancelOrder = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = request.auth.uid;
  const { orderId, reason = 'Cancelled by customer prior to dispatch.' } = request.data || {};
  if (!orderId || typeof orderId !== 'string') {
    throw new HttpsError('invalid-argument', 'orderId is required.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const itemsSnap = await orderRef.collection('items').get();

  return await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderSnap.data()!;
    if (orderData.customerUid !== uid) {
      throw new HttpsError('permission-denied', 'You can only cancel your own orders.');
    }
    if (orderData.orderStatus !== 'pending_verification') {
      throw new HttpsError('failed-precondition', 'Only orders in pending_verification state can be cancelled by the customer.');
    }

    const now = FieldValue.serverTimestamp();

    // Restore stock for each line item
    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();
      const productRef = db.collection('products').doc(item.productId);
      const variantRef = productRef.collection('variants').doc(item.variantId);
      const [prodSnap, varSnap] = await Promise.all([tx.get(productRef), tx.get(variantRef)]);

      if (prodSnap.exists) {
        const nextProdStock = Number(prodSnap.data()!.stockCount ?? 0) + Number(item.quantity);
        tx.update(productRef, { stockCount: nextProdStock, lastOrderId: orderId, updatedAt: now });
      }
      if (varSnap.exists) {
        const nextVarStock = Number(varSnap.data()!.stockCount ?? 0) + Number(item.quantity);
        tx.update(variantRef, { stockCount: nextVarStock, isAvailable: nextVarStock > 0, lastOrderId: orderId, updatedAt: now });
      }
    }

    tx.update(orderRef, {
      orderStatus: 'cancelled',
      updatedAt: now,
    });

    const eventId = `evt_${orderId}_cancel_${Date.now()}`;
    tx.set(db.collection('orderStatusEvents').doc(eventId), {
      id: eventId,
      orderId,
      customerUid: uid,
      previousStatus: 'pending_verification',
      newStatus: 'cancelled',
      actorUid: uid,
      actorRole: 'customer',
      note: String(reason).slice(0, 350),
      createdAt: now,
    });

    return { success: true, orderId, newStatus: 'cancelled' };
  });
});

/**
 * Privileged Cloud Function: adminUpdateOrderStatus
 * Enforces admin authority and updates order and payment status with audit event.
 */
export const adminUpdateOrderStatus = onCall({ region: 'asia-south1' }, async (request) => {
  const caller = await verifyCallerIsAdmin(request.auth);
  const { orderId, orderStatus, paymentStatus, note } = request.data || {};

  if (!orderId || typeof orderId !== 'string') {
    throw new HttpsError('invalid-argument', 'orderId is required.');
  }

  const validStatuses = ['pending_verification', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  const validPayments = ['unpaid_cod', 'collected_cod', 'refunded'];

  if (!validStatuses.includes(orderStatus) || !validPayments.includes(paymentStatus)) {
    throw new HttpsError('invalid-argument', 'Invalid order or payment status.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }
    const data = snap.data()!;
    const prevStatus = data.orderStatus || 'pending_verification';
    const now = FieldValue.serverTimestamp();

    tx.update(orderRef, {
      orderStatus,
      paymentStatus,
      updatedAt: now,
    });

    const eventId = `evt_${orderId}_${orderStatus}_${Date.now()}`;
    tx.set(db.collection('orderStatusEvents').doc(eventId), {
      id: eventId,
      orderId,
      customerUid: data.customerUid,
      previousStatus: prevStatus,
      newStatus: orderStatus,
      actorUid: caller.uid,
      actorRole: 'admin',
      note: String(note || `Updated to ${orderStatus} (${paymentStatus}) by Admin`).slice(0, 350),
      createdAt: now,
    });

    return { success: true, orderId, orderStatus, paymentStatus };
  });
});
