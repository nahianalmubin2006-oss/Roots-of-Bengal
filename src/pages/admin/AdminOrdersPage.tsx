import React, { useState } from 'react';
import { Package, CheckCircle2, Phone, MapPin, AlertCircle } from 'lucide-react';
import { OrderLifecycleStatus, OrderRecord, PaymentLifecycleStatus } from '../../types/heritage';
import { adminUpdateOrderStatus } from '../../lib/firebaseOrders';

interface AdminOrdersPageProps {
  orders: OrderRecord[];
  onTriggerToast: (msg: string) => void;
}

export const AdminOrdersPage: React.FC<AdminOrdersPageProps> = ({
  orders,
  onTriggerToast,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'in_transit' | 'delivered'>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'pending') return o.orderStatus === 'pending_verification';
    if (selectedFilter === 'in_transit') return o.orderStatus === 'confirmed' || o.orderStatus === 'packed' || o.orderStatus === 'shipped';
    if (selectedFilter === 'delivered') return o.orderStatus === 'delivered';
    return true;
  });

  const handleStatusTransition = async (
    orderId: string,
    nextStatus: OrderLifecycleStatus,
    nextPayment: PaymentLifecycleStatus
  ) => {
    setUpdatingOrderId(orderId);
    try {
      await adminUpdateOrderStatus(
        orderId,
        nextStatus,
        nextPayment,
        `Admin transitioned order to ${nextStatus}`
      );
      onTriggerToast(`Order ${orderId} updated to ${nextStatus}.`);
    } catch (err) {
      onTriggerToast(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-[#8a4b2a] pb-4">
        <div>
          <h1 className="font-editorial text-3xl text-[#3b2a1a]">
            Orders & Cash on Delivery (COD) Management
          </h1>
          <p className="text-xs text-[#3b2a1a]/75 mt-0.5">
            Verify pending Bangladesh COD orders, dispatch courier packages, and record cash collections
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(
            [
              ['all', 'All Orders'],
              ['pending', 'Pending Verification'],
              ['in_transit', 'In Transit'],
              ['delivered', 'Delivered'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedFilter(key)}
              className={`px-3 py-1.5 border transition-colors cursor-pointer ${
                selectedFilter === key
                  ? 'bg-[#8a4b2a] text-[#fff3dc] border-[#8a4b2a] font-bold'
                  : 'bg-[#f6ecd4] text-[#3b2a1a] border-[#8a4b2a]/40 hover:bg-[#e4d3ad]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 text-center space-y-3">
          <Package className="w-8 h-8 text-[#8a4b2a] mx-auto" />
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            No orders match this filter
          </h2>
          <p className="text-xs text-[#3b2a1a]/70">
            Real customer Cash on Delivery orders placed through the public checkout will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.orderStatus === 'pending_verification';
            return (
              <div
                key={order.orderId}
                className="craft-card p-6 space-y-4 border border-[#8a4b2a]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#8a4b2a] pb-3">
                  <div>
                    <span className="font-tabular text-sm font-bold text-[#b5502d]">
                      Reference #{order.orderReference || order.orderId}
                    </span>
                    <span className="text-xs text-[#3b2a1a]/75">
                      {' '}
                      · Placed on {order.createdAt} (Firestore Doc: <code>{order.orderId}</code>)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 bg-[#e4d3ad] border border-[#8a4b2a] font-bold text-[#3b2a1a]">
                      Status: {order.orderStatus || 'pending_verification'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#f6ecd4] border border-[#8a4b2a] font-bold text-[#b5502d]">
                      Payment: {order.paymentStatus || 'unpaid_cod'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <strong className="block text-[#3b2a1a] mb-1">Customer & Contact</strong>
                    <p className="font-bold">{order.customerName}</p>
                    <p className="flex items-center gap-1.5 text-[#3b2a1a]/85 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-[#b5502d]" />
                      <span>{order.customerPhone}</span>
                    </p>
                    {order.customerEmail && (
                      <p className="text-[#3b2a1a]/70">{order.customerEmail}</p>
                    )}
                  </div>

                  <div>
                    <strong className="block text-[#3b2a1a] mb-1">Delivery Address</strong>
                    <p className="flex items-start gap-1.5 text-[#3b2a1a]/85">
                      <MapPin className="w-3.5 h-3.5 text-[#8a4b2a] shrink-0 mt-0.5" />
                      <span>
                        {order.shippingAddress}, {order.cityOrDistrict}{' '}
                        {order.postalCode ? `(${order.postalCode})` : ''}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#8a4b2a] mt-1">
                      Zone: {order.deliveryZone === 'dhaka_metro' ? 'Dhaka Metro (৳80)' : 'Outside Dhaka (৳150)'}
                    </p>
                  </div>

                  <div>
                    <strong className="block text-[#3b2a1a] mb-1">Order Total</strong>
                    <div className="font-tabular text-base font-bold text-[#b5502d]">
                      ৳{order.total.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-[#3b2a1a]/75">
                      Subtotal: ৳{order.subtotal.toLocaleString()} + Courier: ৳{order.shippingCost}
                    </span>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="bg-[#e4d3ad]/60 p-3 border border-[#8a4b2a]/30 space-y-1 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}× {item.name} ({item.variantLabel})
                          {item.sku ? ` [SKU: ${item.sku}]` : ''}
                        </span>
                        <span className="font-tabular font-bold">
                          ৳{(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status Transition Actions */}
                <div className="pt-2 border-t border-dashed border-[#8a4b2a] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#8a4b2a]">Admin Action:</span>
                    {isPending && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleStatusTransition(order.orderId, 'confirmed', 'unpaid_cod')}
                        className="px-3 py-1.5 bg-[#5d7a4a] text-white font-bold hover:bg-[#4a633a] cursor-pointer"
                      >
                        Verify Phone & Confirm Order
                      </button>
                    )}
                    {(order.orderStatus === 'confirmed' || isPending) && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleStatusTransition(order.orderId, 'packed', 'unpaid_cod')}
                        className="px-3 py-1.5 bg-[#f6ecd4] border border-[#8a4b2a] hover:bg-[#e4d3ad] cursor-pointer"
                      >
                        Mark Packed
                      </button>
                    )}
                    {order.orderStatus === 'packed' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleStatusTransition(order.orderId, 'shipped', 'unpaid_cod')}
                        className="px-3 py-1.5 bg-[#8a4b2a] text-[#fff3dc] hover:bg-[#3b2a1a] cursor-pointer"
                      >
                        Dispatch via Courier
                      </button>
                    )}
                    {order.orderStatus === 'shipped' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleStatusTransition(order.orderId, 'delivered', 'collected_cod')}
                        className="px-3 py-1.5 bg-[#5d7a4a] text-white font-bold hover:bg-[#4a633a] cursor-pointer"
                      >
                        Mark Delivered & COD Collected
                      </button>
                    )}
                    {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.orderId}
                        onClick={() => handleStatusTransition(order.orderId, 'cancelled', 'unpaid_cod')}
                        className="px-3 py-1.5 border border-[#b5502d] text-[#b5502d] hover:bg-[#b5502d] hover:text-white cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-[#3b2a1a]/70">
                    Payment Status: <strong>{order.paymentStatus}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
