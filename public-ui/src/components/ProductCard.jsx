/** 공개 쇼케이스 제품 카드 */
export default function ProductCard({ product }) {
  if (!product || !product.id) return null;

  const cover = product.images && product.images[0];
  const meta = [product.industry, product.material, product.process].filter(Boolean);
  const href = `showcase-detail.html?id=${encodeURIComponent(product.id)}`;

  return (
    <a className="show-card" href={href}>
      <div className="show-card__media">
        {cover ? (
          <img src={cover} alt={product.title || ''} />
        ) : (
          <span className="show-ph">NO IMAGE</span>
        )}
      </div>
      <div className="show-card__body">
        {product.category ? <span className="tag">{product.category}</span> : null}
        {meta.length ? (
          <div className="show-card__meta">
            {meta.map((v) => (
              <span className="show-meta" key={v}>
                {v}
              </span>
            ))}
          </div>
        ) : null}
        <h3>{product.title}</h3>
        {product.summary ? <p>{product.summary}</p> : null}
      </div>
    </a>
  );
}
