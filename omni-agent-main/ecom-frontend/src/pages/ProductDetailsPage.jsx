import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, addToCart, getReviews, addReview } from '../lib/api';
import { Star, ShoppingCart, ArrowLeft, Truck, Shield } from 'lucide-react';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const CUSTOMER_ID = 'demo-customer-001';

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, revRes] = await Promise.all([
          getProduct(id),
          getReviews(id).catch(() => ({ data: { data: [] } }))
        ]);

        const prod = prodRes.data.data;
        setProduct(prod);
        if (prod.variants?.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }
        setReviews(revRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await addToCart({
        customerId: CUSTOMER_ID,
        variantId: selectedVariant.id,
        quantity: 1
      });
      alert('Added to cart!');
    } catch (err) {
      alert('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!product) return <div className="p-12 text-center">Product not found</div>;

  const firstImage = selectedVariant?.images?.[0] || product.variants?.[0]?.images?.[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 text-sm mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="bg-neutral-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
            {firstImage ? (
              <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-neutral-300 text-4xl font-semibold opacity-20">LUMIÈRE</div>
            )}
          </div>
          {product.variants?.some((v) => v.images?.length) && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...new Set(product.variants.flatMap((v) => v.images || []))].slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedVariant(product.variants.find((v) => v.images?.includes(img)) || selectedVariant)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                    firstImage === img ? 'border-blue-600' : 'border-slate-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
            </div>
            <span className="text-slate-500">({reviews.length} reviews)</span>
          </div>

          <p className="text-xl font-semibold text-neutral-900 mb-4">
            ₹{selectedVariant?.price?.toFixed(2)}
          </p>

          <div className="prose prose-slate prose-sm mb-6 text-neutral-600">
            <p>{product.description}</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-700 mb-2">Select Size</label>
            <div className="flex flex-wrap gap-3">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={!(variant.inStock ?? variant.availableQuantity > 0)}
                  className={`px-4 py-2 text-sm rounded border font-medium transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'border-blue-600 bg-blue-50 text-blue-600 ring-2 ring-blue-600 ring-offset-2'
                      : (variant.inStock ?? variant.availableQuantity > 0)
                        ? 'border-slate-200 hover:border-slate-300 text-slate-700'
                        : 'border-slate-100 text-slate-400 cursor-not-allowed line-through'
                  }`}
                >
                  {variant.size}
                </button>
              ))}
            </div>
            {product.variants.some((v) => v.color) && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <p className="text-slate-600">{selectedVariant?.color || '—'}</p>
              </div>
            )}
            {selectedVariant && (
              <p className={`mt-2 text-sm ${selectedVariant.inStock ?? selectedVariant.availableQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(selectedVariant.inStock ?? selectedVariant.availableQuantity > 0)
                  ? `In Stock (${selectedVariant.availableQuantity ?? 0} available)`
                  : 'Out of Stock'}
              </p>
            )}
          </div>

          <div className="flex gap-3 mb-6 border-b border-neutral-200 pb-6">
            <button
              onClick={handleAddToCart}
              disabled={adding || !selectedVariant?.inStock}
              className="flex-1 bg-neutral-900 text-white py-3 rounded text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {adding ? 'Adding...' : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-neutral-400" />
              <span>Free shipping on orders over $100</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-400" />
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-semibold mb-6">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-slate-500">No reviews yet. Be the first to write one!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-slate-50 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-900">{review.customerName || 'Anonymous'}</span>
                  <div className="flex text-yellow-500">
                    {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                </div>
                <p className="text-slate-600 italic">"{review.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
