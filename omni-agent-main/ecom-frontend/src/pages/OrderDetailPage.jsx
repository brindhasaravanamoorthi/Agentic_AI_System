import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder } from '../lib/api';
import { ArrowLeft, Package, RotateCcw } from 'lucide-react';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    async function load() {
      try {
        const res = await getOrder(CUSTOMER_ID, orderNumber);
        if (res.data?.data) setOrder(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderNumber]);

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-slate-500">Loading...</div>;
  if (!order) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-slate-600 mb-4">Order not found.</p>
      <Link to="/orders" className="text-blue-600 hover:underline">Back to Orders</Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in max-w-4xl">
      <Link to="/orders" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Order {order.orderNumber}</h1>
          <p className="text-slate-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
            order.status === 'completed' ? 'bg-green-100 text-green-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {order.status}
          </span>
        </div>
        <Link
          to="/returns"
          className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Request Return/Refund
        </Link>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 mb-4">Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  {item.variant?.images?.[0] ? (
                    <img src={item.variant.images[0]} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Link to={`/product/${item.productId}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {item.productName}
                  </Link>
                  <p className="text-slate-500 text-sm">
                    {item.variant?.size && `Size: ${item.variant.size}`}
                    {item.variant?.color && ` · Color: ${item.variant.color}`}
                  </p>
                  <p className="text-slate-600 text-sm mt-1">
                    {item.quantity} × ₹{item.priceAtPurchase.toFixed(2)} = ₹{item.subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Shipping</span>
            <span>₹{order.shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>₹{order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
        </div>

        {order.shippingAddress && (
          <div className="p-6 border-t border-slate-100">
            <h2 className="font-bold text-slate-900 mb-2">Shipping Address</h2>
            <p className="text-slate-600">
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
              {order.shippingAddress.country}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
