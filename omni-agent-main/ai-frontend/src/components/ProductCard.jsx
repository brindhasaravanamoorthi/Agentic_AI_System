import { Package } from 'lucide-react';

export function ProductCard({ product, compact }) {
  const isImageUrl = product.image && (product.image.startsWith('http://') || product.image.startsWith('https://'));

  return (
    <div className={`bg-slate-800/80 dark:bg-slate-800/80 rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-lg border border-slate-700/50 ${compact ? 'flex flex-row items-center space-x-4 p-2' : ''}`}>
      <div className={`${compact ? 'w-16 h-16 shrink-0' : 'h-64'} bg-slate-700/50 flex items-center justify-center`}>
        {isImageUrl ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-10 h-10 text-slate-500" />
        )}
      </div>

      <div className={`p-4 ${compact ? 'p-0 flex-1' : ''}`}>
        <h4 className="font-bold text-lg text-white mb-1">{product.name}</h4>

        {product.description && !compact && (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="font-bold text-lg text-[#3b82f6]">${product.price.toFixed(2)}</span>
            <span className="text-xs text-slate-500">Size: {product.size}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${product.stock <= 5
              ? 'bg-red-500/20 text-red-400'
              : 'bg-green-500/20 text-green-400'
            }`}>
            {product.stock <= 5 ? `Low Stock: ${product.stock}` : `Stock: ${product.stock}`}
          </span>
        </div>
      </div>
    </div>
  );
}
