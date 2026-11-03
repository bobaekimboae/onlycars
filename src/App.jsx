import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clapperboard, Copy, Download, ExternalLink, FileVideo2, ImagePlus,
  LayoutDashboard, LifeBuoy, LoaderCircle, Megaphone, MessageSquare, MoreVertical,
  Music2, Pause, Play, Plus, Save, Settings, Trash2, Upload, Wallet, X,
} from "lucide-react";
import logo from "./assets/onlycars-mark.webp";
import { getProject, listProjects, removeProject, saveProject } from "./storage.js";
import { createProjectVideo, MUSIC_TRACKS, previewMusic } from "./video.js";

const CTA_PRESETS = ["시승 예약하기", "이 차량 문의하기", "견적 요청하기", "방문 예약하기"];
const CURRENCIES = [
  ["EUR", "유로"], ["CHF", "스위스 프랑"], ["GBP", "영국 파운드"], ["USD", "미국 달러"],
  ["DKK", "덴마크 크로네"], ["NOK", "노르웨이 크로네"], ["SEK", "스웨덴 크로나"],
  ["PLN", "폴란드 즈워티"], ["CZK", "체코 코루나"], ["HUF", "헝가리 포린트"],
  ["RON", "루마니아 레우"], ["ISK", "아이슬란드 크로나"], ["ALL", "알바니아 렉"],
  ["BAM", "보스니아 마르크"], ["MKD", "마케도니아 데나르"], ["RSD", "세르비아 디나르"],
  ["MDL", "몰도바 레우"], ["UAH", "우크라이나 흐리우냐"], ["TRY", "튀르키예 리라"],
  ["GEL", "조지아 라리"], ["AMD", "아르메니아 드람"], ["AZN", "아제르바이잔 마나트"],
  ["BYN", "벨라루스 루블"], ["RUB", "러시아 루블"], ["KZT", "카자흐스탄 텡게"],
  ["GIP", "지브롤터 파운드"], ["KRW", "대한민국 원"],
];
const DEFAULT_VEHICLE = {
  make: "", model: "", internalId: "", year: "", mileage: "", price: "", currency: "EUR",
  format: "9:16", description: "", callToAction: "", callToActionUrl: "",
};
const DEFAULT_SETTINGS = {
  template: "classic", format: "9:16", motion: "smooth", musicStyle: "luxury", musicTrack: "auto",
};

function readRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "new") return { type: "new" };
  if (hash === "dashboard") return { type: "dashboard" };
  const match = hash.match(/^project\/([^/]+)(?:\/(images|edit|video|details))?$/);
  if (!match) return { type: "new" };
  const panel = match[2] || "edit";
  return { type: panel === "images" ? "images" : panel === "video" ? "video" : panel === "details" ? "details" : "edit", id: match[1] };
}

function idForRoute(route) {
  if (route.type === "new") return "#new";
  if (route.type === "dashboard") return "#dashboard";
  if (route.type === "images") return `#project/${route.id}/images`;
  if (route.type === "video") return `#project/${route.id}/video`;
  if (route.type === "details") return `#project/${route.id}/details`;
  return `#project/${route.id}/edit`;
}

function prettyPrice(vehicle) {
  if (!vehicle?.price) return "";
  const symbols = { EUR: "€", GBP: "£", USD: "$", CHF: "CHF", KRW: "₩", JPY: "¥" };
  const symbol = symbols[vehicle.currency];
  const amount = Number(String(vehicle.price).replace(/[^\d.]/g, ""));
  const formatted = Number.isFinite(amount) ? amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) : vehicle.price;
  return symbol ? `${symbol}${formatted}` : `${formatted} ${vehicle.currency}`;
}

function useObjectUrls(records = []) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const next = records.map(record => URL.createObjectURL(record.blob));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [records]);
  return urls;
}

function Sidebar({ route, onNavigate }) {
  const items = [
    { label: "대시보드", icon: LayoutDashboard, type: "dashboard" },
    { label: "새 영상", icon: Clapperboard, type: "new" },
    { label: "문의", icon: MessageSquare, type: "leads" },
    { label: "영상 크레딧", icon: Wallet, type: "credits" },
    { label: "프로필", icon: Settings, type: "profile" },
    { label: "도움말 및 문의", icon: LifeBuoy, type: "help" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <img src={logo} alt="OnlyCars" />
        <div><strong>OnlyCars</strong><span>Dealer Studio</span></div>
      </div>
      <button className="new-project-chip" onClick={() => onNavigate({ type: "new" })}>새 프로젝트</button>
      <nav className="side-nav" aria-label="주 메뉴">
        {items.map(({ label, icon: Icon, type }) => {
          const active = type === "new" ? route.type !== "dashboard" : route.type === type;
          return <button key={type} className={active ? "nav-item active" : "nav-item"} onClick={() => onNavigate(type === "dashboard" ? { type } : type === "new" ? { type } : { type: "new" })}>
            <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
          </button>;
        })}
      </nav>
      <div className="sidebar-language"><span>언어</span><button className="language-selected">한국어 <b>KR</b></button></div>
      <div className="profile-mini"><div className="avatar">OC</div><div><strong>딜러 스튜디오</strong><span>로컬 작업 공간</span></div></div>
    </aside>
  );
}

function TopBar({ route, onNavigate }) {
  return <header className="topbar">
    <div className="mobile-brand brand-lockup">
      <img src={logo} alt="OnlyCars" />
      <div><strong>OnlyCars</strong><span>Dealer Studio</span></div>
    </div>
    <div className="topbar-account"><button className="help-icon" aria-label="도움말"><CircleHelp size={20} /></button><span>딜러 스튜디오</span></div>
    <button className="dashboard-top" onClick={() => onNavigate({ type: "dashboard" })}><LayoutDashboard size={16} /> 대시보드</button>
  </header>;
}

function MobileNav({ route, onNavigate }) {
  const items = [
    ["대시보드", LayoutDashboard, "dashboard"], ["새 영상", Clapperboard, "new"],
    ["문의", MessageSquare, "leads"], ["크레딧", Wallet, "credits"], ["프로필", Settings, "profile"],
  ];
  return <nav className="mobile-bottom-nav" aria-label="모바일 주 메뉴">
    {items.map(([label, Icon, type]) => <button key={type} className={(type === "new" ? route.type !== "dashboard" : route.type === type) ? "selected" : ""} onClick={() => onNavigate(type === "dashboard" ? { type } : type === "new" ? { type } : { type: "new" })}>
      <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
    </button>)}
  </nav>;
}

function StepRail({ active = 1, onStep }) {
  const steps = [
    ["차량 정보", "제조사와 판매 정보를 입력하세요."],
    ["사진 편집", "차량 사진 4장 이상을 추가하세요."],
    ["영상 편집", "표지, 순서, 분위기와 음악을 선택하세요."],
  ];
  return <div className="step-rail" aria-label="프로젝트 단계">
    {steps.map(([title, detail], index) => <button key={title} className={active === index + 1 ? "step-cell current" : "step-cell"} onClick={() => onStep?.(index + 1)}>
      <span className="step-number">{index + 1}</span><span className="step-copy"><strong>{title}</strong><small>{detail}</small></span>
    </button>)}
  </div>;
}

function Field({ label, children, hint, className = "" }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}

function UploadZone({ inputId, onFiles, label = "차량 사진 선택", compact = false, max = "장당 최대 50MB" }) {
  return <div className={compact ? "upload-zone compact" : "upload-zone"}>
    <label className="drop-target" htmlFor={inputId}>
      <span className="drop-icon"><ImagePlus size={26} strokeWidth={1.8} /></span>
      <strong>{label}</strong>
      <small>JPG, PNG, WebP · {max}</small>
    </label>
    <div className="native-file-row"><label className="file-button" htmlFor={inputId}><Upload size={15} /> 파일 선택</label><span>파일을 선택하지 않았습니다</span></div>
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { onFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
  </div>;
}

function PreviewCard({ project, imageUrl, compact = false }) {
  const vehicle = project?.vehicle || {};
  return <div className={compact ? "cover-card compact" : "cover-card"}>
    {imageUrl ? <img src={imageUrl} alt="영상 표지 미리보기" /> : <div className="cover-placeholder"><CarFront size={42} /><span>차량 표지 미리보기</span></div>}
    <div className="cover-overlay">
      <strong>{`${vehicle.make || "차량 제조사"} ${vehicle.model || "모델"}`}</strong>
      <span>{[vehicle.year, vehicle.mileage && `${Number(vehicle.mileage).toLocaleString("ko-KR")} km`, vehicle.internalId].filter(Boolean).join(" · ") || "연식 · 주행거리 · 매물 번호"}</span>
      <div className="cover-bottom"><b>{prettyPrice(vehicle) || "판매 가격"}</b>{vehicle.callToAction && <em>{vehicle.callToAction}</em>}</div>
    </div>
  </div>;
}

function NewProjectPage({ vehicle, setVehicle, files, setFiles, notice, onCreate, busy }) {
  const previewRecords = useMemo(() => files.map((file, index) => ({ id: `${file.name}-${index}`, blob: file })), [files]);
  const urls = useObjectUrls(previewRecords);
  const invalid = files.length > 30 || files.some(file => file.size > 50 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type));
  const ready = vehicle.make.trim() && vehicle.model.trim() && files.length >= 4 && !invalid;
  const setField = (key, value) => setVehicle(current => ({ ...current, [key]: value }));
  const addFiles = incoming => setFiles(current => {
    const next = [...current, ...incoming].slice(0, 30);
    return next;
  });

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">새 영상</p><h1>차량 프로젝트 만들기</h1><p className="page-subtitle">차량 정보와 사진을 추가한 뒤 표지, 순서, 분위기와 음악을 편집하세요.</p></div>
    </div>
    <StepRail active={1} />
    <div className="create-grid">
      <div className="create-form-column">
        <section className="form-section vehicle-section">
          <div className="section-heading"><div className="section-icon"><CarFront size={19} /></div><div><h2>차량 정보</h2><p>제조사와 모델은 필수입니다. 다른 정보도 입력하면 매물 영상이 더 풍부해집니다.</p></div><span className="step-tag">1단계</span></div>
          <div className="field-grid two-col">
            <Field label="제조사"><input value={vehicle.make} onChange={e => setField("make", e.target.value)} placeholder="예: 포르쉐" autoComplete="off" /></Field>
            <Field label="모델"><input value={vehicle.model} onChange={e => setField("model", e.target.value)} placeholder="예: 911 카레라 4S" autoComplete="off" /></Field>
            <Field label="매물 내부 ID" className="span-two" hint="mobile.de ID, 재고 번호 또는 내부 관리 번호를 입력할 수 있습니다."><input value={vehicle.internalId} onChange={e => setField("internalId", e.target.value)} placeholder="예: OC-2026-104" /></Field>
            <Field label="연식"><input type="number" inputMode="numeric" value={vehicle.year} onChange={e => setField("year", e.target.value)} placeholder="2022" min="1900" max="2035" /></Field>
            <Field label="주행거리"><input type="number" inputMode="numeric" value={vehicle.mileage} onChange={e => setField("mileage", e.target.value)} placeholder="24500" min="0" /></Field>
            <Field label="가격"><input inputMode="decimal" value={vehicle.price} onChange={e => setField("price", e.target.value)} placeholder="89,900" /></Field>
            <Field label="통화"><select value={vehicle.currency} onChange={e => setField("currency", e.target.value)}>{CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}</select></Field>
            <Field label="영상 화면 비율" className="span-two">
              <select value={vehicle.format} onChange={e => setField("format", e.target.value)}>
                <option value="9:16">9:16 · 릴스 / 틱톡 / 쇼츠</option><option value="1:1">1:1 · 피드</option><option value="16:9">16:9 · 웹사이트 / 유튜브</option>
              </select>
              <small className="field-hint">9:16은 릴스, 틱톡과 쇼츠에 가장 잘 맞습니다.</small>
            </Field>
          </div>
        </section>

        <section className="form-section listing-section">
          <div className="section-heading"><div className="section-icon coral"><Megaphone size={18} /></div><div><h2>매물 설명과 문의 유도</h2><p>짧은 차량 설명과 구매자가 취할 다음 행동을 정하세요.</p></div><span className="step-tag">2단계</span></div>
          <Field label="차량 설명" hint="차량의 특징, 상태와 주요 장점을 간결하게 적어 주세요."><textarea value={vehicle.description} onChange={e => setField("description", e.target.value)} placeholder="스포츠 배기, 가죽 시트, 인증 보증, 무사고 차량…" rows="4" /></Field>
          <div className="cta-box"><div className="cta-heading"><strong>문의 유도 문구</strong><p>선택한 문구가 영상과 공유 페이지에 표시됩니다.</p></div>
            <div className="preset-row">{CTA_PRESETS.map(text => <button type="button" key={text} className={vehicle.callToAction === text ? "preset active" : "preset"} onClick={() => setField("callToAction", text)}>{text}</button>)}</div>
            <div className="field-grid two-col cta-fields">
              <Field label="직접 입력 (선택)" hint="비워 두면 매물 기본 문구를 사용합니다."><input value={vehicle.callToAction} onChange={e => setField("callToAction", e.target.value)} placeholder="시승 예약하기" /></Field>
              <Field label="문의 링크 (선택)" hint="링크가 없으면 프로필 정보가 표시됩니다."><input value={vehicle.callToActionUrl} onChange={e => setField("callToActionUrl", e.target.value)} placeholder="dealer.example/vehicle" /></Field>
            </div>
          </div>
        </section>
      </div>

      <aside className="image-side-column">
        <section className="image-select-card">
          <div className="section-heading image-heading"><div><h2>사진 선택</h2><p>차량 사진 4~30장을 선택하세요. 첫 번째 사진이 처음 표지가 됩니다.</p></div><span className="count-badge">{files.length} <small>/ 4</small></span></div>
          <div className="image-progress"><span>사진 선택</span><strong>{files.length >= 4 ? "준비 완료" : "최소 4장"}</strong><div><i style={{ width: `${Math.min(100, (files.length / 4) * 100)}%` }} /></div></div>
          {files.length === 0 ? <UploadZone inputId="initial-images" onFiles={addFiles} /> : <>
            <div className="initial-photo-grid">{files.map((file, index) => <div className="initial-photo" key={`${file.name}-${index}`}><img src={urls[index]} alt={`차량 사진 ${index + 1}`} /><button type="button" aria-label={`사진 ${index + 1} 삭제`} onClick={() => setFiles(current => current.filter((_, at) => at !== index))}><X size={14} /></button>{index === 0 && <span>표지</span>}</div>)}</div>
            {files.length < 30 && <UploadZone inputId="initial-images-more" onFiles={addFiles} compact label="사진 추가" />}
            <p className="file-counter">{files.length}장 선택됨 · 최대 30장</p>
          </>}
          {invalid && <p className="inline-error">JPG, PNG, WebP 형식으로 장당 50MB 이하의 사진을 30장까지 선택하세요.</p>}
          {notice && <p className="inline-error">{notice}</p>}
          <div className="ready-card"><h3>프로젝트 준비</h3><ReadinessItem ok={vehicle.make.trim().length > 0 && vehicle.model.trim().length > 0} text="제조사와 모델 입력" /><ReadinessItem ok={files.length >= 4} text="차량 사진 4장 이상" /><ReadinessItem ok={!invalid && files.length > 0} text="사진 형식과 용량 확인" />
            <div className="hint-card"><CircleHelp size={16} /><span>9:16 세로 영상은 세로형 사진이 잘 어울립니다. 가로 사진은 차량과 주변 여백이 충분히 보이도록 촬영해 주세요.</span></div>
            <ol className="photo-guidance"><li>시선을 끄는 외관 사진을 표지로 선택</li><li>전면, 측면과 후면 사진</li><li>실내와 대시보드</li><li>휠, 세부 디자인과 주요 기능</li></ol>
          </div>
          <button className="primary wide create-project-btn" disabled={!ready || busy} onClick={() => onCreate(vehicle, files)}>{busy ? <><LoaderCircle className="spin" size={17} /> 프로젝트 저장 중</> : <><Upload size={17} /> 프로젝트 만들기</>}</button>
        </section>
      </aside>
    </div>
  </>;
}

function ReadinessItem({ ok, text }) {
  return <div className={ok ? "readiness-item good" : "readiness-item"}><span>{ok ? <Check size={14} /> : <span className="empty-check" />}</span><span>{text}</span></div>;
}

function ProjectHeader({ project, active, onNavigate }) {
  return <>
    <div className="project-title-row"><button className="back-link" onClick={() => onNavigate({ type: "dashboard" })}><ArrowLeft size={15} /> 차량 프로젝트</button><div className="project-title-content"><h1>{project.vehicle.make} {project.vehicle.model}</h1><span className="draft-pill">초안</span></div><div className="project-meta"><b>{prettyPrice(project.vehicle) || "가격 미입력"}</b><span>{project.vehicle.year || "연식 미입력"}</span><span>{project.vehicle.mileage ? `${Number(project.vehicle.mileage).toLocaleString("ko-KR")} km` : "주행거리 미입력"}</span>{project.vehicle.internalId && <span>번호 {project.vehicle.internalId}</span>}</div>
      <button className="secondary details-edit" onClick={() => onNavigate({ type: "details", id: project.id })}>차량 정보 수정 <ArrowRight size={14} /></button>
    </div>
    <StepRail active={active} onStep={step => onNavigate({ type: step === 1 ? "details" : step === 2 ? "images" : "edit", id: project.id })} />
    <div className="project-tabs" role="tablist" aria-label="프로젝트 섹션">
      <button className={active === 2 ? "project-tab selected" : "project-tab"} onClick={() => onNavigate({ type: "images", id: project.id })}><ImagePlus size={17} /> 사진 <b>{project.images.length}</b></button>
      <button className={active === 3 ? "project-tab selected" : "project-tab"} onClick={() => onNavigate({ type: "edit", id: project.id })}><Settings size={17} /> 룩과 음악</button>
      <button className={active === 4 ? "project-tab selected" : "project-tab"} onClick={() => onNavigate({ type: "video", id: project.id })}><Clapperboard size={17} /> 영상 <b>{project.video ? 1 : 0}</b></button>
    </div>
  </>;
}

function ImageManager({ project, onUpdate, onNavigate, notice }) {
  const urls = useObjectUrls(project.images);
  const [addNotice, setAddNotice] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const addFiles = fileList => {
    const incoming = fileList.filter(file => /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 10 * 1024 * 1024);
    const rejected = fileList.length - incoming.length;
    const available = Math.max(0, 30 - project.images.length);
    const chosen = incoming.slice(0, available);
    if (rejected) setAddNotice("추가 사진은 JPG, PNG, WebP 형식으로 장당 10MB 이하여야 합니다.");
    else if (incoming.length > available) setAddNotice(`사진은 최대 30장까지 추가할 수 있습니다. ${available}장만 더 선택할 수 있습니다.`);
    else setAddNotice("");
    if (!chosen.length) return;
    const images = [...project.images, ...chosen.map((file, index) => ({ id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, blob: file }))];
    onUpdate({ ...project, images });
  };
  const mutateOrder = (index, direction) => {
    const next = [...project.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onUpdate({ ...project, images: next });
  };
  const setCover = index => {
    const next = [...project.images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onUpdate({ ...project, images: next });
  };
  const removeImage = index => {
    if (project.images.length <= 4) { setAddNotice("표지를 포함해 사진을 최소 4장 남겨 주세요."); return; }
    onUpdate({ ...project, images: project.images.filter((_, at) => at !== index) });
    setAddNotice("");
  };
  const handleDrop = (event, index) => {
    event.preventDefault();
    if (dragIndex == null || dragIndex === index) return;
    const next = [...project.images];
    const [moving] = next.splice(dragIndex, 1);
    next.splice(index, 0, moving);
    onUpdate({ ...project, images: next });
    setDragIndex(null);
  };

  return <>
    <ProjectHeader project={project} active={2} onNavigate={onNavigate} />
    <div className="notice success-notice"><Check size={16} /> 사진을 불러왔습니다. 표지와 사진 순서를 정리하세요.</div>
    <div className="project-status-strip"><span className="status-ready">준비</span><span>{project.images.length} / 30장</span><span>매물 ID {project.vehicle.internalId || "—"}</span></div>
    <h2 className="manage-heading">사진 관리</h2><p className="manage-subtitle">표지 사진을 고르고 영상에 표시될 순서대로 사진을 배치하세요.</p>
    <div className="readiness-summary"><div><span>영상 준비도</span><strong>100%</strong></div><div className="readiness-meter"><i style={{ width: `${Math.min(100, project.images.length * 15)}%` }} /></div><div className="metric-pair"><span>사진<strong>{project.images.length}</strong></span><span>추가 가능<strong>{30 - project.images.length}</strong></span><span>표지<strong>선택됨</strong></span></div></div>
    <div className="image-manager-grid">
      <section className="order-panel"><div className="panel-heading"><div><h3>사진 순서</h3><p>{project.images.length}장 · 저장됨</p></div><span className="saved-label">저장 완료</span></div>
        <div className="managed-photo-list">{project.images.map((image, index) => <article className="managed-photo" key={image.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event, index)} onDragEnd={() => setDragIndex(null)}>
          <img src={urls[index]} alt={`${project.vehicle.make} ${project.vehicle.model}, 사진 ${index + 1}`} />
          <div className="managed-photo-details"><strong>{index === 0 ? "표지 사진" : `사진 ${index + 1}`}</strong><span>{(image.size / 1024 / 1024).toFixed(1)} MB</span></div>
          <div className="managed-photo-actions">{index > 0 && <button aria-label={`사진 ${index + 1} 표지로 지정`} onClick={() => setCover(index)}><span className="star">★</span><span className="sr-only">표지로 지정</span></button>}<button aria-label={`사진 ${index + 1} 앞으로 이동`} disabled={index === 0} onClick={() => mutateOrder(index, -1)}><ChevronLeft size={17} /></button><button aria-label={`사진 ${index + 1} 뒤로 이동`} disabled={index === project.images.length - 1} onClick={() => mutateOrder(index, 1)}><ChevronRight size={17} /></button><button className="delete-photo" aria-label={`사진 ${index + 1} 삭제`} onClick={() => removeImage(index)}><Trash2 size={15} /></button></div>
          {index === 0 && <span className="cover-label">표지</span>}
        </article>)}</div>
      </section>
      <aside className="add-images-panel"><section className="add-images-card"><h3>사진 추가</h3><p>{30 - project.images.length}장까지 더 추가할 수 있습니다.</p><UploadZone inputId="additional-images" onFiles={addFiles} compact label="새 사진 선택" max="장당 최대 10MB" />{addNotice && <p className="inline-error">{addNotice}</p>}<p className="field-hint">사진을 선택하면 프로젝트에 바로 저장됩니다.</p></section>
        <section className="current-cover-card"><h3>현재 표지</h3><PreviewCard project={project} imageUrl={urls[0]} compact /></section>
        <section className="suggested-order"><h3>추천 순서</h3><ol><li>가장 잘 보이는 외관</li><li>전면과 측면</li><li>후면과 옆모습</li><li>실내와 대시보드</li><li>휠과 세부 디자인</li></ol><p>사진을 왜곡하지 않습니다. 9:16 영상에서는 차량을 가운데에 두고 주변 여백을 남겨 주세요.</p></section>
      </aside>
    </div>
    {notice && <p className="inline-error">{notice}</p>}
    <div className="page-actions"><button className="secondary" onClick={() => onNavigate({ type: "details", id: project.id })}><ArrowLeft size={16} /> 차량 정보</button><button className="primary" onClick={() => onNavigate({ type: "edit", id: project.id })}>룩과 음악 편집 <ArrowRight size={16} /></button></div>
  </>;
}

const STYLE_OPTIONS = [
  ["clean", "클린 비디오"], ["classic", "클래식"], ["luxury", "럭셔리"], ["dynamic", "다이내믹"],
];
const MOTION_OPTIONS = [["smooth", "부드럽게"], ["cinematic", "시네마틱"], ["energetic", "활기차게"], ["showroom", "쇼룸"]];
const MUSIC_OPTIONS = [["luxury", "럭셔리"], ["sporty", "스포티"], ["urban", "어반"], ["classic", "클래식 카"], ["none", "음악 없음"]];
const TRACK_OPTIONS = [
  ["auto", "자동 선택", "현재 음악 분위기에 맞는 트랙"],
  ["jazz", "그랜드 재즈 라운지", "온리카스 음원 라이브러리 · 미리듣기 · 0:55"],
  ["midnight", "미드나잇 이그제큐티브", "온리카스 음원 라이브러리 · 미리듣기 · 0:55"],
  ["silver", "실버 블러바드", "온리카스 음원 라이브러리 · 미리듣기 · 0:55"],
  ["velvet", "벨벳 액셀러레이션", "온리카스 음원 라이브러리 · 미리듣기 · 0:55"],
];

function ChoiceGroup({ title, options, value, onChange, columns = 2 }) {
  return <fieldset className={`choice-group cols-${columns}`}><legend>{title}</legend><div className="choice-grid">{options.map(([id, label]) => <label key={id} className={value === id ? "choice selected" : "choice"}><input type="radio" checked={value === id} onChange={() => onChange(id)} /><span>{label}</span></label>)}</div></fieldset>;
}

function ProjectEditor({ project, onUpdate, onNavigate, onGenerate, generating, progress, notice }) {
  const [draft, setDraft] = useState(project.settings || DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState("");
  const previewStop = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(project.settings || DEFAULT_SETTINGS);
  const urls = useObjectUrls(project.images);
  useEffect(() => {
    setDraft(project.settings || DEFAULT_SETTINGS);
  }, [project.id, project.settings]);
  useEffect(() => () => previewStop.current?.(), []);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const playPreview = async trackId => {
    previewStop.current?.();
    setPlaying(trackId);
    try {
      previewStop.current = await previewMusic(trackId, draft.musicStyle === "none" ? "luxury" : draft.musicStyle, 6);
      window.setTimeout(() => { if (previewStop.current) { previewStop.current(); previewStop.current = null; setPlaying(""); } }, 6000);
    } catch {
      setPlaying("");
    }
  };
  const saveSettings = () => onUpdate({ ...project, settings: draft });
  const discardSettings = () => setDraft(project.settings || DEFAULT_SETTINGS);

  return <>
    <ProjectHeader project={project} active={3} onNavigate={onNavigate} />
    <div className="editor-layout">
      <section className="settings-panel">
        <div className="panel-title-row"><div><h2>룩과 음악</h2><p>{dirty ? "저장되지 않은 설정이 있습니다." : "저장됨"}</p></div><span className={dirty ? "unsaved-label" : "saved-label"}>{dirty ? "수정 중" : "저장 완료"}</span></div>
        <div className="settings-groups">
          <ChoiceGroup title="템플릿" options={STYLE_OPTIONS} value={draft.template} onChange={value => change("template", value)} />
          <ChoiceGroup title="화면 비율" options={[["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]]} value={draft.format} onChange={value => change("format", value)} columns={3} />
          <ChoiceGroup title="움직임" options={MOTION_OPTIONS} value={draft.motion} onChange={value => change("motion", value)} />
          <ChoiceGroup title="음악 분위기" options={MUSIC_OPTIONS} value={draft.musicStyle} onChange={value => change("musicStyle", value)} />
          {draft.musicStyle !== "none" && <fieldset className="tracks-group"><legend>음악 트랙 <span>4개 트랙</span></legend>
            <div className="track-list">{TRACK_OPTIONS.map(([id, name, detail]) => <div className={draft.musicTrack === id ? "track-option selected" : "track-option"} key={id}>
              <label className="track-radio"><input type="radio" checked={draft.musicTrack === id} onChange={() => change("musicTrack", id)} /><span className="track-copy"><strong>{name}</strong><small>{detail}</small></span></label>
              {id !== "auto" && <button className="track-play" aria-label={playing === id ? `${name} 미리듣기 일시 정지` : `${name} 미리듣기`} onClick={() => playing === id ? (previewStop.current?.(), previewStop.current = null, setPlaying("")) : playPreview(id)}>{playing === id ? <Pause size={16} /> : <Play size={16} />}</button>}
            </div>)}</div>
          </fieldset>}
        </div>
        <div className="settings-actions"><button className="primary" disabled={!dirty} onClick={saveSettings}><Save size={16} /> 설정 저장</button><button className="text-button" disabled={!dirty} onClick={discardSettings}>변경 취소</button></div>
      </section>
      <aside className="editor-side">
        <section className="cover-preview-panel"><div className="panel-title-row"><h3>표지 미리보기</h3><span>{draft.format}</span></div><PreviewCard project={{ ...project, settings: draft }} imageUrl={urls[0]} /></section>
        <section className="render-panel"><div className="panel-title-row"><h3>영상 만들기</h3><Clapperboard size={18} /></div>
          <dl className="render-summary"><div><dt>화면 비율</dt><dd>{draft.format}</dd></div><div><dt>템플릿</dt><dd>{STYLE_OPTIONS.find(([id]) => id === draft.template)?.[1]}</dd></div><div><dt>움직임</dt><dd>{MOTION_OPTIONS.find(([id]) => id === draft.motion)?.[1]}</dd></div><div><dt>음악</dt><dd>{MUSIC_OPTIONS.find(([id]) => id === draft.musicStyle)?.[1]}</dd></div><div><dt>사진</dt><dd>{project.images.length}</dd></div></dl>
          <div className="credit-balance"><span><Wallet size={16} /> 영상 크레딧</span><strong>0</strong><small>이 기기에서 무료로 제작</small></div>
          <div className="render-checks"><span><Check size={14} /> 사진 {project.images.length}장 준비</span><span><Check size={14} /> {dirty ? "설정을 저장해야 합니다" : "설정 저장됨"}</span></div>
          <button className="primary wide render-button" disabled={generating || dirty || project.images.length < 4} onClick={onGenerate}>{generating ? <><LoaderCircle size={17} className="spin" /> 영상 만드는 중 {progress}%</> : <><Clapperboard size={17} /> MP4 영상 만들기</>}</button>
          {generating && <div className="render-progress"><i style={{ width: `${progress}%` }} /></div>}
          <p className="render-note">사진은 서버에 업로드되지 않습니다. 생성된 영상도 이 브라우저에 저장됩니다.</p>
          {notice && <p className="inline-error">{notice}</p>}
        </section>
      </aside>
    </div>
  </>;
}

function VideoTab({ project, onNavigate, notice }) {
  const videoUrl = useMemo(() => project.video ? URL.createObjectURL(project.video) : "", [project.video]);
  useEffect(() => () => videoUrl && URL.revokeObjectURL(videoUrl), [videoUrl]);
  const download = () => {
    if (!project.video) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = project.videoName || `${project.vehicle.make}-${project.vehicle.model}-onlycars.mp4`;
    link.click();
  };
  return <>
    <ProjectHeader project={project} active={4} onNavigate={onNavigate} />
    {project.video ? <div className="video-result-layout"><section className="video-player-card"><video src={videoUrl} controls playsInline aria-label="생성된 차량 영상" /><div className="video-result-actions"><button className="secondary" onClick={() => onNavigate({ type: "edit", id: project.id })}><ArrowLeft size={16} /> 설정으로 돌아가기</button><button className="primary" onClick={download}><Download size={16} /> 영상 다운로드</button></div></section><aside className="video-meta-card"><h2>영상이 준비됐습니다</h2><p>미리보기로 확인한 뒤 파일을 저장해 SNS에 올리세요.</p><dl className="render-summary"><div><dt>화면 비율</dt><dd>{project.settings.format}</dd></div><div><dt>사진</dt><dd>{project.images.length}</dd></div><div><dt>형식</dt><dd>MP4 · H.264</dd></div><div><dt>처리</dt><dd>브라우저에서 생성</dd></div></dl><button className="primary wide" onClick={download}><Download size={16} /> MP4 다운로드</button></aside></div> : <div className="empty-video-state"><FileVideo2 size={36} /><h2>완성된 영상이 아직 없습니다</h2><p>룩과 음악을 선택하고 MP4 영상을 만들어 보세요.</p><button className="secondary" onClick={() => onNavigate({ type: "edit", id: project.id })}>설정 열기 <ArrowRight size={16} /></button></div>}
    {notice && <p className="inline-error">{notice}</p>}
  </>;
}

function DetailsEditor({ project, onUpdate, onNavigate, notice }) {
  const [draft, setDraft] = useState(project.vehicle);
  useEffect(() => setDraft(project.vehicle), [project.id, project.vehicle]);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const save = () => onUpdate({ ...project, vehicle: draft });
  return <>
    <ProjectHeader project={project} active={1} onNavigate={onNavigate} />
    <div className="details-editor-card"><div className="section-heading"><div className="section-icon"><CarFront size={19} /></div><div><h2>차량 정보</h2><p>프로젝트에 표시할 매물 정보를 수정합니다.</p></div></div>
      <div className="field-grid two-col"><Field label="제조사"><input value={draft.make} onChange={e => change("make", e.target.value)} /></Field><Field label="모델"><input value={draft.model} onChange={e => change("model", e.target.value)} /></Field><Field label="매물 내부 ID"><input value={draft.internalId} onChange={e => change("internalId", e.target.value)} /></Field><Field label="연식"><input type="number" value={draft.year} onChange={e => change("year", e.target.value)} /></Field><Field label="주행거리"><input type="number" value={draft.mileage} onChange={e => change("mileage", e.target.value)} /></Field><Field label="가격"><input value={draft.price} onChange={e => change("price", e.target.value)} /></Field><Field label="통화"><select value={draft.currency} onChange={e => change("currency", e.target.value)}>{CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}</select></Field><Field label="화면 비율"><select value={draft.format} onChange={e => change("format", e.target.value)}><option>9:16</option><option>1:1</option><option>16:9</option></select></Field><Field label="차량 설명" className="span-two"><textarea value={draft.description} onChange={e => change("description", e.target.value)} rows="4" /></Field><Field label="문의 유도 문구"><input value={draft.callToAction} onChange={e => change("callToAction", e.target.value)} /></Field><Field label="문의 링크"><input value={draft.callToActionUrl} onChange={e => change("callToActionUrl", e.target.value)} /></Field></div>
      <div className="page-actions"><button className="secondary" onClick={() => onNavigate({ type: "images", id: project.id })}><ArrowLeft size={16} /> 사진으로</button><button className="primary" onClick={save}><Save size={16} /> 차량 정보 저장</button></div>{notice && <p className="inline-error">{notice}</p>}
    </div>
  </>;
}

function Dashboard({ projects, onNavigate }) {
  return <><div className="page-heading"><div><p className="eyebrow">딜러 스튜디오</p><h1>차량 프로젝트</h1><p className="page-subtitle">사진을 정리하고 매물별 숏폼 영상을 만들어 보세요.</p></div><button className="primary" onClick={() => onNavigate({ type: "new" })}><Plus size={17} /> 새 프로젝트</button></div>
    {projects.length ? <div className="dashboard-projects">{projects.map(project => <DashboardProjectCard key={project.id} project={project} onNavigate={onNavigate} />)}</div> : <div className="empty-dashboard"><Clapperboard size={34} /><h2>아직 프로젝트가 없습니다</h2><p>차량 사진을 추가해 첫 영상을 만들어 보세요.</p><button className="primary" onClick={() => onNavigate({ type: "new" })}>새 프로젝트 시작 <ArrowRight size={16} /></button></div>}
  </>;
}

function DashboardProjectCard({ project, onNavigate }) {
  const coverRecords = useMemo(() => project.images.slice(0, 1), [project.images]);
  const cover = useObjectUrls(coverRecords)[0];
  return <button className="dashboard-project" onClick={() => onNavigate({ type: "edit", id: project.id })}><img src={cover} alt="" /><span className="dashboard-project-info"><strong>{project.vehicle.make} {project.vehicle.model}</strong><small>{project.images.length}장 · {project.vehicle.year || "연식 미입력"} · {project.video ? "영상 완성" : "초안"}</small></span><ArrowRight size={18} /></button>;
}

export function App() {
  const [route, setRoute] = useState(readRoute);
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const refreshProjects = useCallback(async () => {
    try { setProjects((await listProjects()).sort((a, b) => b.updatedAt - a.updatedAt)); }
    catch { setNotice("이 브라우저에서 프로젝트를 저장할 수 없습니다. 최신 Chrome, Edge 또는 Safari를 사용해 주세요."); }
  }, []);

  const navigate = useCallback(next => {
    window.location.hash = idForRoute(next);
    setRoute(next);
    setNotice("");
    setSavedNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    refreshProjects();
    const handleHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [refreshProjects]);

  useEffect(() => {
    if (!route.id) { setProject(null); return; }
    let live = true;
    getProject(route.id).then(value => {
      if (live) {
        setProject(value || null);
        if (!value) setNotice("프로젝트를 찾을 수 없습니다.");
      }
    }).catch(() => { if (live) setNotice("프로젝트를 불러오지 못했습니다."); });
    return () => { live = false; };
  }, [route.id]);

  const createProject = async (vehicleData, imageFiles) => {
    setBusy(true);
    setNotice("");
    try {
      const now = Date.now();
      const images = imageFiles.map(file => ({ id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, blob: file }));
      const created = {
        id: crypto.randomUUID(), createdAt: now, updatedAt: now,
        vehicle: { ...vehicleData, price: String(vehicleData.price || "").replace(/,/g, "") },
        images, settings: { ...DEFAULT_SETTINGS, format: vehicleData.format || "9:16" }, video: null, videoName: "",
      };
      await saveProject(created);
      setProject(created);
      setProjects(current => [created, ...current]);
      setFiles([]);
      navigate({ type: "images", id: created.id });
      setSavedNotice("차량 프로젝트를 저장했습니다. 표지와 사진 순서를 확인하세요.");
    } catch (error) {
      setNotice(error?.message || "프로젝트를 저장하지 못했습니다.");
    } finally { setBusy(false); }
  };

  const updateProject = async next => {
    const withDate = { ...next, updatedAt: Date.now() };
    setProject(withDate);
    setProjects(current => current.map(item => item.id === withDate.id ? withDate : item).sort((a, b) => b.updatedAt - a.updatedAt));
    try {
      await saveProject(withDate);
      setSavedNotice("변경 사항을 저장했습니다.");
      setNotice("");
    } catch (error) { setNotice(error?.message || "변경 사항을 저장하지 못했습니다."); }
  };

  const generateVideo = async () => {
    if (!project || generating) return;
    setGenerating(true);
    setProgress(0);
    setNotice("");
    try {
      const blob = await createProjectVideo(project, setProgress);
      const updated = { ...project, video: blob, videoName: `${project.vehicle.make}-${project.vehicle.model}-onlycars.mp4`.replace(/\s+/g, "-").toLowerCase(), updatedAt: Date.now() };
      await saveProject(updated);
      setProject(updated);
      setProjects(current => current.map(item => item.id === updated.id ? updated : item));
      navigate({ type: "video", id: project.id });
    } catch (error) {
      setNotice(error?.message || "영상 생성 중 오류가 발생했습니다. 사진 형식과 브라우저를 확인해 주세요.");
    } finally { setGenerating(false); }
  };

  const deleteProject = async () => {
    if (!project || !window.confirm("이 로컬 프로젝트와 사진을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    await removeProject(project.id);
    await refreshProjects();
    navigate({ type: "dashboard" });
  };

  return <div className="app-frame">
    <Sidebar route={route} onNavigate={navigate} />
    <div className="app-shell"><TopBar route={route} onNavigate={navigate} />
      <main className="main-content">
        {route.type === "new" && <NewProjectPage vehicle={vehicle} setVehicle={setVehicle} files={files} setFiles={setFiles} notice={notice} busy={busy} onCreate={createProject} />}
        {route.type === "dashboard" && <Dashboard projects={projects} onNavigate={navigate} />}
        {route.id && !project && <div className="loading-state"><LoaderCircle className="spin" /> 프로젝트를 불러오는 중…</div>}
        {project && route.type === "images" && <ImageManager project={project} onUpdate={updateProject} onNavigate={navigate} notice={notice} />}
        {project && route.type === "edit" && <ProjectEditor project={project} onUpdate={updateProject} onNavigate={navigate} onGenerate={generateVideo} generating={generating} progress={progress} notice={notice} />}
        {project && route.type === "video" && <VideoTab project={project} onNavigate={navigate} notice={notice} />}
        {project && route.type === "details" && <DetailsEditor project={project} onUpdate={updateProject} onNavigate={navigate} notice={notice} />}
        {project && route.type !== "new" && route.type !== "dashboard" && <div className="more-actions-wrap"><details className="more-actions"><summary><MoreVertical size={16} /> 더 보기</summary><button onClick={async () => { const copy = { ...project, id: crypto.randomUUID(), vehicle: { ...project.vehicle, internalId: `${project.vehicle.internalId || "OC"}-복사` }, video: null, videoName: "", createdAt: Date.now(), updatedAt: Date.now() }; await saveProject(copy); await refreshProjects(); navigate({ type: "edit", id: copy.id }); }}><Copy size={15} /> 프로젝트 복제</button><button className="danger-text" onClick={deleteProject}><Trash2 size={15} /> 프로젝트 영구 삭제</button></details></div>}
        {savedNotice && <div className="toast"><Check size={15} /> {savedNotice}</div>}
      </main>
    </div>
    <MobileNav route={route} onNavigate={navigate} />
  </div>;
}
