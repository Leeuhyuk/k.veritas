/**
 * 검색·SNS 공유용 필드 (알기 쉬운 라벨)
 * @param {{ seoTitle: string, seoDescription: string, ogImage: string, onChange: (key: string, val: string) => void, titleFallback?: string, imageFallback?: string, idPrefix?: string }} props
 */
export default function SeoFields({
  seoTitle,
  seoDescription,
  ogImage,
  onChange,
  titleFallback = '등록 제목',
  imageFallback = '첨부한 대표 사진',
  idPrefix = 'seo',
}) {
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;
  const imageId = `${idPrefix}-image`;

  return (
    <div className="seo-fields">
      <div className="seo-fields__head">
        <p className="seo-fields__title">검색·공유 미리보기 설정</p>
        <p className="seo-fields__help">
          구글 검색 결과, 카카오톡·메신저로 링크를 보낼 때 보이는 제목·설명·사진입니다. 비워 두면 자동으로 채워집니다.
        </p>
      </div>

      <div className="form__grid">
        <div className="form__row">
          <label htmlFor={titleId}>
            검색·공유 제목
            <span className="seo-fields__opt">선택</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={seoTitle}
            onChange={(e) => onChange('seoTitle', e.target.value)}
            placeholder={`비워 두면 「${titleFallback}」 사용`}
            autoComplete="off"
          />
        </div>
        <div className="form__row">
          <label htmlFor={imageId}>
            공유할 때 보일 사진 주소
            <span className="seo-fields__opt">선택</span>
          </label>
          <input
            id={imageId}
            type="text"
            value={ogImage}
            onChange={(e) => onChange('ogImage', e.target.value)}
            placeholder={`비워 두면 ${imageFallback} 사용 · https://...`}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="form__row">
        <label htmlFor={descId}>
          검색·공유 설명
          <span className="seo-fields__opt">선택</span>
        </label>
        <input
          id={descId}
          type="text"
          value={seoDescription}
          onChange={(e) => onChange('seoDescription', e.target.value)}
          placeholder="한두 줄로 짧게 적어 주세요 (예: 정밀 가공 부품을 소개합니다)"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
