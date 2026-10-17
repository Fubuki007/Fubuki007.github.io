import { useEffect, useRef, useState } from "react";
import seed from "../../public/data/tools.json";
import Dialog from "./Dialog.jsx";
import { connectGitHub, readBookmarks, repository, saveBookmarkChange, validateBookmark, validateCollection } from "./bookmarks.js";

const cacheKey = "chuxue-tools-cache-v1";
const emptyBookmark = { title: "", url: "", sourceUrl: "", category: "", description: "" };

function cachedBookmarks() {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return validateCollection(JSON.parse(cached));
  } catch { /* A readable page is still available when browser storage is blocked. */ }
  return validateCollection(seed);
}

function Icon({ name, ...props }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    arrow: <path d="M6 18 18 6M6 6h12v12" />,
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></>,
    edit: <><path d="m16 3 5 5L8 21H3v-5L16 3Zm-3 3 5 5" /></>,
    delete: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></>,
    link: <><path d="m9 15 6-6M7 14l-2 2a3.5 3.5 0 0 0 5 5l4-4M17 10l2-2a3.5 3.5 0 0 0-5-5l-4 4" /></>,
    github: <><path d="M9 20c-4 1-4-2-6-2m12 4v-4a4 4 0 0 0-1-3c3 0 6-1 6-5a5 5 0 0 0-1-3 4 4 0 0 0 0-4s-1 0-4 2a13 13 0 0 0-6 0C6 3 5 3 5 3a4 4 0 0 0 0 4 5 5 0 0 0-1 3c0 4 3 5 6 5a4 4 0 0 0-1 3v4" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function ConnectForm({ onConnect, onClose, busy }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onConnect(token.trim());
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="dialog-intro">连接 {repository.owner} 的 GitHub 账号，管理收藏并同步到其他设备。</p>
      <ol className="connection-steps">
        <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">在 GitHub 创建访问令牌 <Icon name="arrow" /></a>（Fine-grained token）。</li>
        <li>Resource owner 选择 <strong>{repository.owner}</strong>，Repository access 只选择 <strong>{repository.name}</strong>。</li>
        <li>Repository permissions 中将 <strong>Contents</strong> 设置为 <strong>Read and write</strong>，生成后粘贴到下方。</li>
      </ol>
      <label className="field">
        <span>GitHub 访问令牌</span>
        <input type="password" name="github-token" autoComplete="off" autoCapitalize="none" spellCheck="false" required autoFocus value={token} onChange={(event) => setToken(event.target.value)} disabled={busy} placeholder="github_pat_…" />
      </label>
      <p className="field-help">令牌仅用于当前标签页，关闭或刷新后需重新连接。它不会写入仓库或浏览器存储。收藏链接会随公开仓库公开显示。</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="tool-button secondary" onClick={onClose} disabled={busy}>取消</button>
        <button type="submit" className="tool-button primary" disabled={busy || !token.trim()}>{busy ? "正在连接…" : "连接 GitHub"}</button>
      </div>
    </form>
  );
}

function BookmarkForm({ item, categories, onSave, onClose, busy }) {
  const [draft, setDraft] = useState(item ?? emptyBookmark);
  const [error, setError] = useState("");
  const id = useRef(item?.id ?? crypto.randomUUID());

  function field(key) {
    return { value: draft[key], disabled: busy, onChange: (event) => setDraft({ ...draft, [key]: event.target.value }) };
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave(validateBookmark({ ...draft, id: id.current }));
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field"><span>名称</span><input autoFocus required maxLength={80} placeholder="例如：九宫格图片裁剪" {...field("title")} /></label>
      <label className="field"><span>工具链接</span><input type="url" required maxLength={2048} placeholder="https://…" {...field("url")} /></label>
      <label className="field"><span>分类 <small>选填</small></span><input list="tool-categories" maxLength={30} placeholder="例如：图片工具、科研、开发" {...field("category")} /></label>
      <datalist id="tool-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
      <label className="field"><span>说明 <small>选填</small></span><textarea rows={3} maxLength={500} placeholder="简单记录一下用途" {...field("description")} /></label>
      <label className="field"><span>源码或备用链接 <small>选填</small></span><input type="url" maxLength={2048} placeholder="https://github.com/…" {...field("sourceUrl")} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="tool-button secondary" onClick={onClose} disabled={busy}>取消</button>
        <button type="submit" className="tool-button primary" disabled={busy}>{busy ? "正在保存…" : "保存到 GitHub"}</button>
      </div>
    </form>
  );
}

function DeleteForm({ item, onDelete, onClose, busy }) {
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    try { await onDelete(); } catch (failure) { setError(failure.message); }
  }
  return (
    <form onSubmit={submit}>
      <p className="dialog-intro">确定删除“{item.title}”吗？删除后会同步到你的其他设备。</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button autoFocus type="button" className="tool-button secondary" onClick={onClose} disabled={busy}>保留收藏</button>
        <button type="submit" className="tool-button danger" disabled={busy}>{busy ? "正在删除…" : "确认删除"}</button>
      </div>
    </form>
  );
}

export default function ToolsPage() {
  const [collection, setCollection] = useState(cachedBookmarks);
  const [session, setSession] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [syncedAt, setSyncedAt] = useState(null);
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  function acceptCollection(next) {
    setCollection(next);
    setSyncedAt(new Date());
    setLoadError("");
    try { localStorage.setItem(cacheKey, JSON.stringify({ version: 1, bookmarks: next.bookmarks })); } catch { /* Cache is optional; GitHub is the source of truth. */ }
  }

  function notify(message) {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 4500);
  }

  useEffect(() => {
    const controller = new AbortController();
    readBookmarks({ signal: controller.signal })
      .then((next) => { if (!controller.signal.aborted) acceptCollection(next); })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function refresh() {
    setLoading(true);
    try { acceptCollection(await readBookmarks({ token: session?.token })); }
    catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }

  async function connect(token) {
    setBusy(true);
    try {
      const result = await connectGitHub(token);
      setSession({ token, login: result.login });
      acceptCollection(result.collection);
      setDialog(dialog.next === "add" ? { type: "add" } : null);
      notify("已连接 GitHub，可以管理收藏了。");
    } finally { setBusy(false); }
  }

  async function save(change) {
    setBusy(true);
    try {
      acceptCollection(await saveBookmarkChange(session?.token, change));
      setDialog(null);
      notify(change.type === "delete" ? "收藏已删除，并同步到 GitHub。" : "收藏已保存到 GitHub。");
    } finally { setBusy(false); }
  }

  function exportBookmarks() {
    const blob = new Blob([`${JSON.stringify({ version: 1, bookmarks: collection.bookmarks }, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "小工具收藏.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const categories = [...new Set(collection.bookmarks.map((item) => item.category))];
  const selectedCategory = categories.includes(category) ? category : "";
  const search = query.trim().toLocaleLowerCase();
  const bookmarks = collection.bookmarks.filter((item) =>
    (!selectedCategory || item.category === selectedCategory) &&
    [item.title, item.description, item.category, item.url, item.sourceUrl].some((value) => value.toLocaleLowerCase().includes(search)),
  );
  const controlsDisabled = busy || loading;

  return (
    <div className="tools-page">
      <a className="skip-link" href="#tools-main">跳转到收藏</a>
      <header className="tools-header">
        <div className="shell tools-header-inner">
          <a className="tools-home" href="/">← 返回主页</a>
          <nav aria-label="页面导航"><a href="/">个人主页</a><a href="/tools/" aria-current="page">小工具</a></nav>
          <div className="account-controls">
            {session ? <>
              <span className="connected-label"><i />{session.login}</span>
              <button className="tool-button secondary compact" disabled={controlsDisabled} onClick={() => { setSession(null); notify("已断开连接，收藏仍保存在 GitHub。"); }}>断开</button>
            </> : <button className="tool-button secondary compact" onClick={() => setDialog({ type: "connect" })} disabled={controlsDisabled}><Icon name="github" />连接 GitHub</button>}
          </div>
        </div>
      </header>

      <main id="tools-main" className="shell tools-main">
        <div className="tools-title-row">
          <div>
            <p className="tools-eyebrow">BOOKMARKS / 常用收藏</p>
            <h1>小工具<span>。</span></h1>
            <p className="tools-description">常用工具和链接，放在这里方便找到。</p>
          </div>
          <button className="tool-button primary add-bookmark" disabled={controlsDisabled} onClick={() => setDialog(session ? { type: "add" } : { type: "connect", next: "add" })}><Icon name="plus" />添加链接</button>
        </div>

        <div className="tools-toolbar">
          <label className="bookmark-search"><Icon name="search" /><input type="search" aria-label="搜索收藏" placeholder="搜索名称、用途或网址" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className="toolbar-actions">
            <button className="tool-button secondary" disabled={controlsDisabled} onClick={refresh}><Icon name="refresh" />{loading ? "读取中…" : "刷新"}</button>
            <button className="tool-button secondary" onClick={exportBookmarks}><Icon name="download" />导出收藏</button>
          </div>
        </div>

        <div className="tools-filter-row">
          <div className="category-filters" aria-label="按分类筛选">
            <button aria-pressed={!selectedCategory} onClick={() => setCategory("")}>全部 <span>{collection.bookmarks.length}</span></button>
            {categories.map((item) => <button key={item} aria-pressed={selectedCategory === item} onClick={() => setCategory(item)}>{item} <span>{collection.bookmarks.filter((bookmark) => bookmark.category === item).length}</span></button>)}
          </div>
          <span className="sync-status" role="status"><i className={loadError ? "is-offline" : ""} />{loading ? "正在读取 GitHub 收藏" : loadError ? "显示已缓存收藏" : "已同步 GitHub"}</span>
        </div>

        {loadError && <div className="sync-error" role="alert">{loadError} 当前展示上次缓存或初始收藏，点击“刷新”重新获取。</div>}

        <div className="bookmark-grid" aria-label="工具收藏">
          {bookmarks.map((item) => <article className="bookmark-card" key={item.id}>
            <div className="bookmark-card-top"><span className="bookmark-icon"><Icon name={item.category.includes("图片") ? "grid" : "link"} /></span><span className="bookmark-category">{item.category}</span></div>
            <h2><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h2>
            <p className="bookmark-description">{item.description || "暂无说明"}</p>
            <span className="bookmark-domain">{new URL(item.url).hostname}</span>
            <div className="bookmark-card-bottom">
              <a className="open-tool" href={item.url} target="_blank" rel="noopener noreferrer">打开工具 <Icon name="arrow" /></a>
              {item.sourceUrl && <a className="source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{new URL(item.sourceUrl).hostname === "github.com" ? "GitHub 源码" : "备用链接"} <Icon name="arrow" /></a>}
              {session && <div className="bookmark-edit-actions">
                <button className="icon-button" aria-label={`编辑 ${item.title}`} disabled={controlsDisabled} onClick={() => setDialog({ type: "edit", item })}><Icon name="edit" /></button>
                <button className="icon-button delete-bookmark" aria-label={`删除 ${item.title}`} disabled={controlsDisabled} onClick={() => setDialog({ type: "delete", item })}><Icon name="delete" /></button>
              </div>}
            </div>
          </article>)}
        </div>
        {!bookmarks.length && <div className="bookmarks-empty"><Icon name="link" /><h2>{collection.bookmarks.length ? "没有找到匹配的收藏" : "还没有收藏"}</h2><p>{collection.bookmarks.length ? "试试其他关键词或分类。" : "点击“添加链接”，放入第一个常用工具。"}</p></div>}

        <div className="tools-footnote"><span>公开收藏 · 仅仓库主人可管理</span><span>{syncedAt ? `最近读取 ${syncedAt.toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>
      </main>
      <footer className="shell tools-footer"><a href="/">← 返回个人主页</a><a href={`https://github.com/${repository.owner}/${repository.name}/blob/master/${repository.path}`} target="_blank" rel="noopener noreferrer">收藏数据 <Icon name="arrow" /></a></footer>

      {dialog && <Dialog key={dialog.type} title={dialog.type === "connect" ? "连接 GitHub" : dialog.type === "delete" ? "删除收藏" : dialog.type === "edit" ? "编辑链接" : "添加链接"} busy={busy} onClose={() => setDialog(null)}>
        {dialog.type === "connect" ? <ConnectForm busy={busy} onConnect={connect} onClose={() => setDialog(null)} /> : dialog.type === "delete" ? <DeleteForm item={dialog.item} busy={busy} onClose={() => setDialog(null)} onDelete={() => save({ type: "delete", item: dialog.item, original: dialog.item })} /> : <BookmarkForm item={dialog.item} categories={categories} busy={busy} onClose={() => setDialog(null)} onSave={(item) => save({ type: dialog.type, item, original: dialog.item })} />}
      </Dialog>}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">{toast}</div>
    </div>
  );
}
