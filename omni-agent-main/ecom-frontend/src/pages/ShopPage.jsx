import { useState, useEffect } from 'react';
import { getProducts, getCategories } from '../lib/api';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Heart } from 'lucide-react';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, catRes] = await Promise.all([
          getProducts({ category: category || undefined, search: search || undefined, limit: 50 }),
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
  }, [category, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    setSearchParams(params);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-1">Shop All</h1>
      <p className="text-neutral-500 text-sm mb-6">Discover our full collection.</p>

      {/* Filters - compact */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded border border-neutral-200 focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 outline-none"
            />
          </div>
          <button type="submit" className="bg-neutral-900 text-white px-4 py-2 text-sm font-medium rounded hover:bg-neutral-800">
            Search
          </button>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              const params = new URLSearchParams();
              if (search) params.set('search', search);
              if (e.target.value) params.set('category', e.target.value);
              setSearchParams(params);
            }}
            className="px-3 py-2 text-sm rounded border border-neutral-200 focus:ring-1 focus:ring-neutral-400 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name} ({cat.productCount})</option>
            ))}
          </select>
        </div>
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
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 text-sm">No products found. Try adjusting your search or filters.</p>
          <button onClick={() => { setSearch(''); setCategory(''); setSearchParams({}); }} className="mt-3 text-sm text-neutral-700 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <Link to={`/product/${product.id}`} key={product.id} className="group">
              <div className="relative aspect-square rounded overflow-hidden bg-neutral-50 mb-2">
                {product.variants?.[0]?.images?.[0] ? (
                  <img src={product.variants[0].images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
  );
}
