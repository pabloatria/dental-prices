import { Price } from '@/lib/types'
import SupplierLink from '@/components/product/SupplierLink'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

export default function PriceTable({ prices, productId }: { prices: Price[]; productId: string }) {
  const sorted = [...prices].sort((a, b) => a.price - b.price)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tienda</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Precio</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Stock</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((price, i) => (
            <tr key={price.id} className={`border-b border-gray-50 ${i === 0 ? 'bg-green-50' : ''}`}>
              <td className="py-3 px-4">
                <span className="font-medium text-gray-900">{price.supplier.name}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-bold ${i === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {formatCLP(price.price)}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`text-sm ${price.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                  {price.in_stock ? 'Disponible' : 'Agotado'}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <SupplierLink
                  productUrl={price.product_url}
                  productId={productId}
                  supplierId={price.supplier_id}
                  supplierName={price.supplier.name}
                  price={price.price}
                  source="price_table"
                  className="inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Ir a comprar
                </SupplierLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
