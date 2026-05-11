import ProductForm from '@/components/admin/ProductForm';
export const metadata = { title: 'New Product — Admin' };

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New Catalog Product</h1>
      <ProductForm />
    </div>
  );
}
