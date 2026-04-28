import { useState, useEffect } from 'react';
import { getOrders } from '../lib/api';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Truck } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    async function load() {
      try {
        const res = await getOrders(CUSTOMER_ID);
        if (res.data?.data) setOrders(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="container mx-auto px-4 py-20 text-center text-slate-500">Loading orders...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">Order History</h1>
      <p className="text-slate-600 mb-10">View and track your orders.</p>

      {orders.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h2>
          <p className="text-slate-600 mb-6">Start shopping to see your orders here.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-colors"
          >
            Shop Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.orderNumber}`}
              className="block bg-white border border-slate-100 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Truck className="w-8 h-8 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{order.orderNumber}</h3>
                    <p className="text-slate-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900">₹{order.total.toFixed(2)}</span>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
