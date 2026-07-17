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
    // 카테고리 옵션 = 공개 사이트의 현재 카테고리(정적 스냅샷) 기준
    try {
      const r = await fetch('../static-api/categories.json', { cache: 'no-store' });
      const cats = r.ok ? await r.json() : [];
      setCategories(Array.isArray(cats) && cats.length ? cats : DEFAULT_CATS);
    } catch {
      setCategories(DEFAULT_CATS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  async function publishToPublic() {
    if (!adminApi.isStatic) {
      setImportMsg('이 기능은 배포(정적 호스팅) 관리자에서만 동작합니다.');
      return;
    }
    setImporting(true);
    setImportMsg('공개 사이트에 반영 중…');
    try {
      const r = await adminApi.publishProducts();
      setImportMsg(`공개 반영 완료: ${r.count}개. 생산제품 페이지에 표시됩니다. (잠시 후/새로고침)`);
    } catch (e) {
      setImportMsg(e.message || '공개 반영에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  }

  async function importSamples() {
    if (!adminApi.isStatic) {
      setImportMsg('이 기능은 배포(정적 호스팅) 관리자에서만 동작합니다.');
      return;
    }
    if (!window.confirm('공개 사이트의 시험 장비 카탈로그(38종)를 관리자 DB로 가져올까요?\n(이미 있는 항목은 건너뜁니다)')) return;
    setImporting(true);
    setImportMsg('가져오는 중…');
    try {
      const r = await adminApi.importSampleProducts();
      setImportMsg(`완료: ${r.added}개 추가 (전체 ${r.total}개). 이제 목록에서 관리·삭제할 수 있습니다.`);
      await load();
    } catch (e) {
      setImportMsg(e.message || '가져오기에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  }

  async function handleEdit(id) {
    try {
      const p = await adminApi.product(id);
      setEditId(p.id);
      setEditInitial({
        title: p.title || '',
        category: p.category || '',
        status: p.status === 'draft' ? 'draft' : 'published',
        industry: p.industry || '',
        material: p.material || '',
        process: p.process || '',
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
        editId={editId}
        initial={editInitial}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
      <div className="admin__cats" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={publishToPublic} disabled={importing}>
          공개 사이트에 반영
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={importSamples} disabled={importing}>
          공개 카탈로그(38종) 가져오기
        </button>
        {importMsg ? <span className="admin__msg" style={{ fontSize: '12px' }}>{importMsg}</span> : null}
      </div>
      <ProductList
        items={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
      />
    </>
  );
}
