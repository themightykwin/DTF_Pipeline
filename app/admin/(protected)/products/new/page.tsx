import ProductForm from '@/components/admin/ProductForm';
export const metadata = { title: 'New Product — Admin' };

export default function NewProductPage() {
  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#F5F5F5', marginBottom: '24px', fontFamily: 'Syne, sans-serif' }}>
        New Catalog Product
      </h1>
      <ProductForm />
    </div>
  );
}
