import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  CartItem,
  DeliveryZoneCode,
  OrderLifecycleStatus,
  OrderRecord,
  OrderStatusEvent,
  PaymentLifecycleStatus,
  Product,
} from '../types/heritage';
import {
  bdtToPoisha,
  getBangladeshDeliveryFeeBdt,
  isValidBangladeshPhone,
} from '../utils/currency';
import { getCanonicalFirestoreProductId } from './firebaseProducts';

export interface CreateLiveCodOrderInput {
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  district: string;
  thana: string;
  postalCode?: string;
  deliveryInstructions?: string;
  deliveryZone: DeliveryZoneCode;
  cart: CartItem[];
  catalogProducts: Product[];
}

export function generateServerOrderReference(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ROB-${datePart}-${randomPart}`;
}

function formatFirestoreTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof val === 'string' && val) return val;
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Executes an atomic Firestore transaction to place a verified Cash on Delivery (COD) order.
 * Enforces:
 * 1. Authenticated customer UID matching order owner
 * 2. Idempotency key deduplication (`ord_${uid}_${idempotencyKey}`)
 * 3. Server-side Firestore product & variant verification (`isPublished == true`, `isDemoData == false`, `verificationStatus == 'verified'`)
 * 4. Atomic variant & product stock check and decrement (preventing negative stock)
 * 5. Server-side price calculation in integer BDT and poisha (`priceMinorUnits`)
 * 6. Initial status `pending_verification` and `paymentStatus: 'unpaid_cod'`
 */
export async function createLiveCodOrder(
  input: CreateLiveCodOrderInput
): Promise<{ order: OrderRecord; alreadyExisted: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with your Google account to place a verified live order.');
  }

  const uid = currentUser.uid;
  const cleanName = input.customerName.trim();
  const cleanPhone = input.customerPhone.replace(/[\s-]/g, '');
  const cleanEmail = (input.customerEmail || currentUser.email || '').trim();
  const cleanAddress = input.shippingAddress.trim();
  const cleanDistrict = input.district.trim();
  const cleanThana = input.thana.trim();
  const cleanPostal = (input.postalCode || '').trim();
  const cleanInstructions = (input.deliveryInstructions || '').trim();

  if (cleanName.length < 2 || cleanName.length > 120) {
    throw new Error('Recipient name must be between 2 and 120 characters.');
  }
  if (!isValidBangladeshPhone(cleanPhone)) {
    throw new Error('Please enter a valid Bangladesh mobile number (e.g., 017XXXXXXXX or +88017XXXXXXXX).');
  }
  if (cleanAddress.length < 5 || cleanAddress.length > 400) {
    throw new Error('Shipping address must be between 5 and 400 characters.');
  }
  if (cleanDistrict.length < 2 || cleanThana.length < 2) {
    throw new Error('Both District and Thana / Upazila are required for Bangladesh delivery.');
  }
  if (!input.cart.length || input.cart.length > 50) {
    throw new Error('Your shopping bag must contain between 1 and 50 items.');
  }

  const sanitizedIdempotency = input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (sanitizedIdempotency.length < 8) {
    throw new Error('Invalid order idempotency key.');
  }

  const orderId = `ord_${uid.slice(0, 10)}_${sanitizedIdempotency}`;
  const orderRef = doc(db, 'orders', orderId);

  try {
    return await runTransaction(db, async (tx) => {
      const existingSnap = await tx.get(orderRef);
      if (existingSnap.exists()) {
        const data = existingSnap.data();
        return {
          alreadyExisted: true,
          order: {
            orderId: data.id,
            orderReference: data.orderReference,
            idempotencyKey: data.idempotencyKey,
            customerUid: data.customerUid,
            createdAt: formatFirestoreTimestamp(data.createdAt),
            market: 'BD',
            currencySymbol: '৳',
            customerName: data.customerName,
            customerEmail: data.customerEmail || '',
            customerPhone: data.customerPhone,
            shippingAddress: data.shippingAddress,
            cityOrDistrict: `${data.thana}, ${data.district}`,
            thana: data.thana,
            postalCode: data.postalCode || '',
            deliveryInstructions: data.deliveryInstructions || '',
            deliveryZone: data.deliveryZone,
            deliveryMethodLabel:
              data.deliveryZone === 'dhaka_metro'
                ? 'Inside Dhaka Metro Courier (2–3 Days)'
                : 'Outside Dhaka Nationwide Courier (4–6 Days)',
            paymentMethod: 'COD',
            paymentMethodLabel: 'Cash on Delivery (COD — Unpaid, Pending Phone Verification)',
            paymentStatus: data.paymentStatus,
            orderStatus: data.orderStatus,
            items: [],
            subtotal: data.subtotalBdt,
            shippingCost: data.shippingBdt,
            total: data.totalBdt,
            subtotalMinorUnits: data.subtotalMinorUnits,
            shippingMinorUnits: data.shippingMinorUnits,
            totalMinorUnits: data.totalMinorUnits,
            isDemoOrder: false,
          },
        };
      }

      // First read all product & variant docs in the transaction (Firestore requires all reads before writes)
      const itemReads = await Promise.all(
        input.cart.map(async (cartItem, idx) => {
          const firestoreProductId = getCanonicalFirestoreProductId(cartItem.productId);
          const prodRef = doc(db, 'products', firestoreProductId);
          const varRef = doc(db, 'products', firestoreProductId, 'variants', cartItem.variantId);
          const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
          return {
            idx,
            cartItem,
            firestoreProductId,
            prodRef,
            varRef,
            prodSnap,
            varSnap,
          };
        })
      );

      let subtotalBdt = 0;
      let subtotalMinorUnits = 0;
      let totalItemCount = 0;

      const validatedLines: Array<{
        itemId: string;
        numericProductId: number;
        firestoreProductId: string;
        variantId: string;
        sku: string;
        productNameEn: string;
        variantLabelEn: string;
        quantity: number;
        unitPriceBdt: number;
        unitPriceMinorUnits: number;
        lineTotalMinorUnits: number;
        prodRef: ReturnType<typeof doc>;
        varRef: ReturnType<typeof doc>;
        nextProdStock: number;
        nextProdReserved: number;
        nextVarStock: number;
        nextVarReserved: number;
      }> = [];

      for (const entry of itemReads) {
        const { idx, cartItem, firestoreProductId, prodRef, varRef, prodSnap, varSnap } = entry;
        if (!prodSnap.exists() || !varSnap.exists()) {
          throw new Error(
            `Product "${firestoreProductId}" has not been verified/published in live Firestore yet. Ask an Admin to verify the catalog or switch to Demo Preview mode.`
          );
        }

        const prodData = prodSnap.data();
        const varData = varSnap.data();

        if (!prodData.isPublished || prodData.isDemoData || prodData.verificationStatus !== 'verified') {
          throw new Error(
            `"${prodData.nameEn}" is marked as unverified/demo data and cannot be purchased in live mode.`
          );
        }

        const currentVarStock = Number(varData.stockCount ?? 0);
        const currentProdStock = Number(prodData.stockCount ?? 0);
        const currentVarReserved = Number(varData.reservedStock ?? 0);
        const currentProdReserved = Number(prodData.reservedStock ?? 0);

        if (!varData.isAvailable || currentVarStock < cartItem.quantity || currentProdStock < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for "${prodData.nameEn} (${varData.labelEn})". Available: ${currentVarStock}, requested: ${cartItem.quantity}.`
          );
        }

        // Strict server-side pricing from Firestore document
        const unitPriceBdt = Number(varData.priceBdt);
        const unitPriceMinorUnits = Number(varData.priceMinorUnits ?? bdtToPoisha(unitPriceBdt));
        const lineTotalMinorUnits = unitPriceMinorUnits * cartItem.quantity;

        subtotalBdt += unitPriceBdt * cartItem.quantity;
        subtotalMinorUnits += lineTotalMinorUnits;
        totalItemCount += cartItem.quantity;

        validatedLines.push({
          itemId: `item_${idx + 1}_${cartItem.variantId}`,
          numericProductId: cartItem.productId,
          firestoreProductId,
          variantId: cartItem.variantId,
          sku: String(varData.sku),
          productNameEn: String(prodData.nameEn),
          variantLabelEn: String(varData.labelEn),
          quantity: cartItem.quantity,
          unitPriceBdt,
          unitPriceMinorUnits,
          lineTotalMinorUnits,
          prodRef,
          varRef,
          nextProdStock: currentProdStock - cartItem.quantity,
          nextProdReserved: currentProdReserved,
          nextVarStock: currentVarStock - cartItem.quantity,
          nextVarReserved: currentVarReserved,
        });
      }

      const shippingBdt = getBangladeshDeliveryFeeBdt(input.deliveryZone);
      const shippingMinorUnits = bdtToPoisha(shippingBdt);
      const totalBdt = subtotalBdt + shippingBdt;
      const totalMinorUnits = subtotalMinorUnits + shippingMinorUnits;
      const orderReference = generateServerOrderReference();
      const now = serverTimestamp();

      // 1. Update stock counts on products and variants
      for (const line of validatedLines) {
        tx.update(line.prodRef, {
          stockCount: line.nextProdStock,
          reservedStock: line.nextProdReserved,
          updatedAt: now,
        });
        tx.update(line.varRef, {
          stockCount: line.nextVarStock,
          reservedStock: line.nextVarReserved,
          isAvailable: line.nextVarStock > 0,
          updatedAt: now,
        });
      }

      // 2. Write main order document
      const orderPayload = {
        id: orderId,
        orderReference,
        idempotencyKey: sanitizedIdempotency,
        customerUid: uid,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        shippingAddress: cleanAddress,
        district: cleanDistrict,
        thana: cleanThana,
        postalCode: cleanPostal,
        deliveryInstructions: cleanInstructions,
        deliveryZone: input.deliveryZone,
        paymentMethod: 'COD' as const,
        paymentStatus: 'unpaid_cod' as PaymentLifecycleStatus,
        orderStatus: 'pending_verification' as OrderLifecycleStatus,
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
      tx.set(orderRef, orderPayload);

      // 3. Write immutable order item documents
      for (const line of validatedLines) {
        const itemRef = doc(db, 'orders', orderId, 'items', line.itemId);
        tx.set(itemRef, {
          id: line.itemId,
          orderId,
          customerUid: uid,
          productId: line.firestoreProductId,
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

      // 4. Write initial status audit event
      const eventId = `evt_${orderId}_init`;
      const eventRef = doc(db, 'orderStatusEvents', eventId);
      tx.set(eventRef, {
        id: eventId,
        orderId,
        customerUid: uid,
        previousStatus: 'none',
        newStatus: 'pending_verification',
        actorUid: uid,
        actorRole: 'customer',
        note: 'Cash on Delivery (COD) order created; awaiting phone verification.',
        createdAt: now,
      });

      const uiOrderRecord: OrderRecord = {
        orderId,
        orderReference,
        idempotencyKey: sanitizedIdempotency,
        customerUid: uid,
        createdAt: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        market: 'BD',
        currencySymbol: '৳',
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        shippingAddress: cleanAddress,
        cityOrDistrict: `${cleanThana}, ${cleanDistrict}`,
        thana: cleanThana,
        postalCode: cleanPostal,
        deliveryInstructions: cleanInstructions,
        deliveryZone: input.deliveryZone,
        deliveryMethodLabel:
          input.deliveryZone === 'dhaka_metro'
            ? 'Inside Dhaka Metro Courier (2–3 Days)'
            : 'Outside Dhaka Nationwide Courier (4–6 Days)',
        paymentMethod: 'COD',
        paymentMethodLabel: 'Cash on Delivery (COD — Unpaid, Pending Phone Verification)',
        paymentStatus: 'unpaid_cod',
        orderStatus: 'pending_verification',
        items: validatedLines.map((l) => ({
          productId: l.numericProductId,
          firestoreProductId: l.firestoreProductId,
          variantId: l.variantId,
          sku: l.sku,
          name: l.productNameEn,
          variantLabel: l.variantLabelEn,
          quantity: l.quantity,
          unitPrice: l.unitPriceBdt,
          unitPriceMinorUnits: l.unitPriceMinorUnits,
          lineTotalMinorUnits: l.lineTotalMinorUnits,
        })),
        subtotal: subtotalBdt,
        shippingCost: shippingBdt,
        total: totalBdt,
        subtotalMinorUnits,
        shippingMinorUnits,
        totalMinorUnits,
        isDemoOrder: false,
      };

      return {
        alreadyExisted: false,
        order: uiOrderRecord,
      };
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission-denied')) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
    throw err;
  }
}

/**
 * Allows an authenticated customer to cancel their own order ONLY while it is in `pending_verification`,
 * restoring variant and product stock transactionally.
 */
export async function cancelLiveCodOrder(orderId: string, reason = 'Cancelled by customer prior to dispatch.'): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required to cancel an order.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const itemsSnap = await getDocs(collection(db, 'orders', orderId, 'items'));

  try {
    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Order not found.');
      }

      const orderData = orderSnap.data();
      if (orderData.customerUid !== currentUser.uid) {
        throw new Error('You are only permitted to cancel your own orders.');
      }
      if (orderData.orderStatus !== 'pending_verification') {
        throw new Error('Order can only be cancelled while in pending_verification state.');
      }

      // Read all product & variant docs first
      const stockReads = await Promise.all(
        itemsSnap.docs.map(async (itemDoc) => {
          const item = itemDoc.data();
          const prodRef = doc(db, 'products', item.productId);
          const varRef = doc(db, 'products', item.productId, 'variants', item.variantId);
          const [prodSnap, varSnap] = await Promise.all([tx.get(prodRef), tx.get(varRef)]);
          return { item, prodRef, varRef, prodSnap, varSnap };
        })
      );

      const now = serverTimestamp();

      for (const sr of stockReads) {
        if (sr.prodSnap.exists()) {
          const pData = sr.prodSnap.data();
          tx.update(sr.prodRef, {
            stockCount: Number(pData.stockCount ?? 0) + Number(sr.item.quantity),
            reservedStock: Number(pData.reservedStock ?? 0),
            updatedAt: now,
          });
        }
        if (sr.varSnap.exists()) {
          const vData = sr.varSnap.data();
          const nextStock = Number(vData.stockCount ?? 0) + Number(sr.item.quantity);
          tx.update(sr.varRef, {
            stockCount: nextStock,
            reservedStock: Number(vData.reservedStock ?? 0),
            isAvailable: nextStock > 0,
            updatedAt: now,
          });
        }
      }

      tx.update(orderRef, {
        orderStatus: 'cancelled',
        updatedAt: now,
      });

      const eventId = `evt_${orderId}_cancel_${Date.now()}`;
      const eventRef = doc(db, 'orderStatusEvents', eventId);
      tx.set(eventRef, {
        id: eventId,
        orderId,
        customerUid: currentUser.uid,
        previousStatus: 'pending_verification',
        newStatus: 'cancelled',
        actorUid: currentUser.uid,
        actorRole: 'customer',
        note: reason.slice(0, 350),
        createdAt: now,
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission-denied')) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
    throw err;
  }
}

/**
 * Admin Action: Update an order's lifecycle status and payment status, recording an immutable audit event.
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  newOrderStatus: OrderLifecycleStatus,
  newPaymentStatus: PaymentLifecycleStatus,
  note: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin authentication required.');

  const orderRef = doc(db, 'orders', orderId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error('Order not found.');
      const data = snap.data();
      const prevStatus = String(data.orderStatus || 'pending_verification');
      const now = serverTimestamp();

      tx.update(orderRef, {
        orderStatus: newOrderStatus,
        paymentStatus: newPaymentStatus,
        updatedAt: now,
      });

      const eventId = `evt_${orderId}_${newOrderStatus}_${Date.now()}`;
      tx.set(doc(db, 'orderStatusEvents', eventId), {
        id: eventId,
        orderId,
        customerUid: data.customerUid,
        previousStatus: prevStatus,
        newStatus: newOrderStatus,
        actorUid: currentUser.uid,
        actorRole: 'admin',
        note: (note || `Status updated to ${newOrderStatus} by Admin`).slice(0, 350),
        createdAt: now,
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

/**
 * Subscribes to the signed-in customer's live orders (or all orders when isAdminMode is enabled).
 */
export function subscribeToUserOrders(
  uid: string,
  isAdminMode: boolean,
  onOrders: (orders: OrderRecord[]) => void
): () => void {
  const ordersCol = collection(db, 'orders');
  const q = isAdminMode
    ? query(ordersCol, orderBy('createdAt', 'desc'))
    : query(ordersCol, where('customerUid', '==', uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      const records: OrderRecord[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const d = docSnap.data();
          const itemsSnap = await getDocs(collection(db, 'orders', docSnap.id, 'items'));
          const items = itemsSnap.docs.map((iDoc) => {
            const idata = iDoc.data();
            const numericId = Number(String(idata.productId).replace('prod_', '')) || 1;
            return {
              productId: numericId,
              firestoreProductId: idata.productId,
              variantId: idata.variantId,
              sku: idata.sku,
              name: idata.productNameEn,
              variantLabel: idata.variantLabelEn,
              quantity: idata.quantity,
              unitPrice: idata.unitPriceBdt,
              unitPriceMinorUnits: idata.unitPriceMinorUnits,
              lineTotalMinorUnits: idata.lineTotalMinorUnits,
            };
          });

          return {
            orderId: d.id,
            orderReference: d.orderReference,
            idempotencyKey: d.idempotencyKey,
            customerUid: d.customerUid,
            createdAt: formatFirestoreTimestamp(d.createdAt),
            updatedAt: formatFirestoreTimestamp(d.updatedAt),
            market: 'BD',
            currencySymbol: '৳',
            customerName: d.customerName,
            customerEmail: d.customerEmail || '',
            customerPhone: d.customerPhone,
            shippingAddress: d.shippingAddress,
            cityOrDistrict: `${d.thana}, ${d.district}`,
            thana: d.thana,
            postalCode: d.postalCode || '',
            deliveryInstructions: d.deliveryInstructions || '',
            deliveryZone: d.deliveryZone,
            deliveryMethodLabel:
              d.deliveryZone === 'dhaka_metro'
                ? 'Inside Dhaka Metro Courier (2–3 Days)'
                : 'Outside Dhaka Nationwide Courier (4–6 Days)',
            paymentMethod: 'COD',
            paymentMethodLabel:
              d.paymentStatus === 'collected_cod'
                ? 'Cash on Delivery (COD — Collected)'
                : 'Cash on Delivery (COD — Unpaid)',
            paymentStatus: d.paymentStatus,
            orderStatus: d.orderStatus,
            items,
            subtotal: d.subtotalBdt,
            shippingCost: d.shippingBdt,
            total: d.totalBdt,
            subtotalMinorUnits: d.subtotalMinorUnits,
            shippingMinorUnits: d.shippingMinorUnits,
            totalMinorUnits: d.totalMinorUnits,
            isDemoOrder: false,
          };
        })
      );

      onOrders(records);
    },
    () => {
      onOrders([]);
    }
  );
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusEvent[]> {
  try {
    const q = query(
      collection(db, 'orderStatusEvents'),
      where('orderId', '==', orderId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id,
        orderId: data.orderId,
        customerUid: data.customerUid,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        actorUid: data.actorUid,
        actorRole: data.actorRole,
        note: data.note,
        createdAt: formatFirestoreTimestamp(data.createdAt),
      };
    });
  } catch {
    return [];
  }
}
