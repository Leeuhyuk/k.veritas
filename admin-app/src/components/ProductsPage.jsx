import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/client.js';
import ProductForm from './ProductForm.jsx';
import ProductList from './ProductList.jsx';

const DEFAULT_CATS = ['가구 내구성', '금속·재료', '내구·피로', '맞춤 시험'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [editId, setEditId] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const prods = await adminApi.products();
    setProducts(Array.isArray(prods) ? prods : []);
    // 카테고리 옵션 = 관리 카테고리(Firestore settings) + 실제 제품에 쓰인 분류
    try {
      const managed = await adminApi.categories();
      const used = (Array.isArray(prods) ? prods : [])
        .map((p) => (p.category || '').trim())
        .filter(Boolean);
      const merged = Array.from(new Set([...(Array.isArray(managed) ? managed : []), ...used]));
      setCategories(merged.length ? merged : DEFAULT_CATS);
    } catch {
      setCategories(DEFAULT_CATS);
    }
    setLoading(false);
  }, []);

  // 새 분류를 Firestore(settings/categories)에 영속화
  const handleAddCategory = useCallback(async (name) => {
    const n = (name || '').trim();
    if (!n) return;
    setCategories((prev) => (prev.includes(n) ? prev : [...prev, n]));
    try { await adminApi.addCategory(n); } catch { /* 목록엔 이미 반영, 저장 실패는 무시 */ }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  async function handleEdit(id) {
    try {
      const p = await adminApi.product(id);
      setEditId(p.id);
      setEditInitial({
        title: p.title || '',
        model: p.model || '',
        category: p.category || '',
        status: p.status === 'draft' ? 'draft' : 'published',
        industry: p.industry || '',
        material: p.material || '',
        process: p.process || '',
        specs: Array.isArray(p.specs) ? p.specs : [],
        summary: p.summary || '',
        body: p.body || '',
        seoTitle: p.seoTitle || '',
        seoDescription: p.seoDescription || '',
        ogImage: p.ogImage || '',
        images: p.images || [],
      });
      setFormKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert(e.message || '제품을 불러오지 못했습니다.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('이 제품을 삭제할까요?')) return;
    try {
      await adminApi.deleteProduct(id);
      if (editId === id) {
        setEditId(null);
        setEditInitial(null);
        setFormKey((k) => k + 1);
      }
      await load();
    } catch (e) {
      alert(e.message || '삭제 실패');
    }
  }

  async function handleReorder(ids) {
    try {
      const next = await adminApi.orderProducts(ids);
      setProducts(Array.isArray(next) ? next : []);
    } catch {
      alert('순서 변경에 실패했습니다.');
      await load();
    }
  }

  function handleSaved() {
    setEditId(null);
    setEditInitial(null);
    setFormKey((k) => k + 1);
    load();
  }

  function handleCancel() {
    setEditId(null);
    setEditInitial(null);
    setFormKey((k) => k + 1);
  }

  if (loading) {
    return <p className="empty-note">불러오는 중…</p>;
  }

  return (
    <>
      <ProductForm
        key={formKey}
        categories={categories}
        onAddCategory={handleAddCategory}
        editId={editId}
        initial={editInitial}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
      <ProductList
        items={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
    </>
  );
}
