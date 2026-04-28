import { useState, useEffect } from 'react';
import { getProducts, getCategories } from '../lib/api';
import { Link } from 'react-router-dom';
import { Truck, Headphones, RotateCcw, Heart } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, catRes] = await Promise.all([
          getProducts({ limit: 10 }),
          getCategories(),
        ]);
        if (prodRes.data?.data?.products) setProducts(prodRes.data.data.products);
        if (catRes.data?.data) setCategories(catRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero - Flone style: split layout, image left, text right */}
      <section className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
        <div className="relative h-64 md:h-[400px] bg-neutral-100">
          <img
            src="https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Hero"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-6 md:px-12 py-8 bg-white">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <span className="w-8 h-px bg-neutral-300" />
            <span className="text-xs uppercase tracking-wider text-neutral-500">Stylish</span>
            <span className="w-8 h-px bg-neutral-300" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-2">Male Clothes</h1>
          <p className="text-neutral-500 text-sm mb-6">30% off Summer Vacation</p>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center w-fit border-2 border-neutral-900 text-neutral-900 px-8 py-2.5 text-sm font-medium hover:bg-neutral-900 hover:text-white transition-colors"
          >
            SHOP NOW
          </Link>
        </div>
      </section>

      {/* Feature Section - 3 columns */}
      <section className="bg-white py-10 border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <Truck className="w-10 h-10 text-neutral-900 mb-3" strokeWidth={1.5} />
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Free Shipping</h3>
            <p className="text-neutral-500 text-xs max-w-[200px]">Free delivery on orders over ₹2,000. Fast and reliable.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Headphones className="w-10 h-10 text-neutral-900 mb-3" strokeWidth={1.5} />
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Support 24/7</h3>
            <p className="text-neutral-500 text-xs max-w-[200px]">Our team is here to help. Contact us anytime.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <RotateCcw className="w-10 h-10 text-neutral-900 mb-3" strokeWidth={1.5} />
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Money Return</h3>
            <p className="text-neutral-500 text-xs max-w-[200px]">30-day return policy. No questions asked.</p>
          </div>
        </div>
      </section>

      {/* New Arrival - compact product grid, 5 per row */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-px bg-neutral-300" />
              <span className="text-xs uppercase tracking-wider text-neutral-500">New Arrival</span>
              <span className="w-6 h-px bg-neutral-300" />
            </div>
            <p className="text-neutral-500 text-xs">Discover our latest collection</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-neutral-100 aspect-square rounded mb-2" />
                  <div className="h-3 bg-neutral-100 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-neutral-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link to={`/product/${product.id}`} key={product.id} className="group">
                  <div className="relative aspect-square rounded overflow-hidden bg-neutral-50 mb-2">
                    {product.variants?.[0]?.images?.[0] ? (
                      <img
                        src={product.variants[0].images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">No Image</div>
                    )}
                    {(product.variants?.some((v) => (v.availableQuantity ?? 0) <= 5) ?? false) && (
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">-10%</span>
                    )}
                    {(product.variants?.some((v) => (v.availableQuantity ?? 0) > 20) ?? false) && (
                      <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">New</span>
                    )}
                    <button className="absolute bottom-2 right-2 p-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                      <Heart className="w-3.5 h-3.5 text-neutral-600" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900 group-hover:text-neutral-600 truncate">{product.name}</h3>
                  <p className="text-sm font-medium text-neutral-700">₹{product.variants?.[0]?.price?.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories - compact */}
      <section className="py-12 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-px bg-neutral-300" />
              <span className="text-xs uppercase tracking-wider text-neutral-500">Shop by Category</span>
              <span className="w-6 h-px bg-neutral-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((cat) => {
              const imgs = { clothing: 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=400', dresses: 'https://images.pexels.com/photos/31830781/pexels-photo-31830781.jpeg?auto=compress&cs=tinysrgb&w=400', accessories: 'https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=400', shoes: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=400' };
              return (
                <Link key={cat.id} to={`/shop?category=${cat.slug}`} className="relative h-40 rounded overflow-hidden group block">
                  <img src={imgs[cat.slug] || imgs.clothing} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="text-center">
                      <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                      <p className="text-white/80 text-xs">{cat.productCount} products</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
