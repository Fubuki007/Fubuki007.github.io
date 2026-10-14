import { useEffect, useRef, useState } from "react";
import { capabilities, profile, projects } from "./content";

const navigation = [
  { id: "about", label: "关于我" },
  { id: "work", label: "精选作品" },
  { id: "expertise", label: "我的优势" },
];
const filters = ["全部", "视觉设计", "品牌设计", "AI 探索"];

function Arrow({ diagonal = false, className = "" }) {
  return (
    <svg
      className={`arrow ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-7-7 7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Mark({ type }) {
  return (
    <svg
      className="capability-mark"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {type === "visual" && (
        <>
          <path d="M14 14h52v52H14zM14 40h52M40 14v52" stroke="currentColor" />
          <circle cx="40" cy="40" r="26" stroke="currentColor" />
          <circle cx="40" cy="40" r="5" fill="currentColor" />
        </>
      )}
      {type === "ai" && (
        <>
          {[0, 45, 90, 135].map((a) => (
            <ellipse
              key={a}
              cx="40"
              cy="40"
              rx="12"
              ry="31"
              stroke="currentColor"
              transform={`rotate(${a} 40 40)`}
            />
          ))}
          <circle cx="40" cy="40" r="4" fill="currentColor" />
        </>
      )}
      {type === "brand" && (
        <>
          <path
            d="m40 8 29 16v32L40 72 11 56V24L40 8Zm0 0v64M11 24l58 32M69 24 11 56"
            stroke="currentColor"
          />
          <path d="m11 24 29 16 29-16M40 40v32" stroke="currentColor" />
        </>
      )}
    </svg>
  );
}

function SectionLabel({ number, children }) {
  return (
    <div className="section-label">
      <span className="section-index">{number}</span>
      <span>{children}</span>
    </div>
  );
}

function ProjectDialog({ project, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!project) return;
    const element = dialog.current;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [project]);
  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="project-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      {project && (
        <article>
          <button
            className="dialog-close"
            autoFocus
            onClick={onClose}
            aria-label="关闭项目详情"
          >
            ✕
          </button>
          <img className="dialog-image" src={project.image} alt={project.alt} />
          <div className="dialog-body">
            <div className="eyebrow">
              {project.disciplines} <span> / CONCEPT STUDY</span>
            </div>
            <h2 id="project-title">{project.title}</h2>
            <p>{project.summary}</p>
            <h3>设计思路</h3>
            <ul>
              {project.approach.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="project-note">{project.note}</p>
            <a
              className="text-link"
              href={`mailto:${profile.email}?subject=${encodeURIComponent(`聊聊 ${project.title}`)}`}
            >
              聊聊这个方向 <Arrow diagonal />
            </a>
          </div>
        </article>
      )}
    </dialog>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("全部");
  const [selectedProject, setSelectedProject] = useState(null);
  const [toast, setToast] = useState("");
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const video = useRef(null);
  const toastTimer = useRef(null);
  const visibleProjects = projects.filter(
    (project) => filter === "全部" || project.category === filter,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActiveSection(entry.target.id);
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll("main > section[id]")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (motion.matches) video.current?.pause();
      else video.current?.play().catch(() => setPlaying(false));
    };
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setToast("邮箱已复制，期待你的来信。");
    } catch {
      setToast(`请手动复制邮箱：${profile.email}`);
    }
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5000);
  }

  function toggleVideo() {
    if (!video.current) return;
    if (playing) video.current.pause();
    else video.current.play().catch(() => setVideoError(true));
  }

  return (
    <>
      <a className="skip-link" href="#main">
        跳转到内容
      </a>
      <header className="site-header">
        <div className="header-inner shell">
          <a
            className="wordmark"
            href="#home"
            aria-label="Fubuki 首页"
            onClick={() => setMenuOpen(false)}
          >
            fubuki<span>®</span>
          </a>
          <span className="header-caption">INDEPENDENT CREATIVE PORTFOLIO</span>
          <button
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? "关闭导航" : "打开导航"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "关闭 −" : "菜单 +"}
          </button>
          <nav
            id="site-nav"
            className={menuOpen ? "navigation is-open" : "navigation"}
            aria-label="主导航"
          >
            {navigation.map((item) => (
              <a
                key={item.id}
                className={activeSection === item.id ? "is-active" : ""}
                aria-current={
                  activeSection === item.id ? "location" : undefined
                }
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              className="nav-contact"
              href="#contact"
              onClick={() => setMenuOpen(false)}
            >
              联系我 <Arrow diagonal />
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-media" aria-hidden="true">
            <img
              className="hero-poster"
              src="/media/hero-poster.png"
              alt=""
              fetchPriority="high"
            />
            <video
              ref={video}
              className={videoError ? "is-hidden" : ""}
              loop
              muted
              playsInline
              preload="metadata"
              poster="/media/hero-poster.png"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                setVideoError(true);
                setPlaying(false);
              }}
            >
              <source src="/media/hero-loop.webm" type="video/webm" />
            </video>
          </div>
          <div className="hero-ruler" aria-hidden="true">
            <span>EXPERIMENT NO. 001</span>
            <span>FORM / LIGHT / POSSIBILITY</span>
          </div>
          <div className="shell hero-content">
            <div className="eyebrow hero-eyebrow">
              <span className="live-dot" /> FUBUKI — DESIGN & EXPLORATION
            </div>
            <h1 id="hero-title">
              Design beyond
              <br />
              the <span className="serif">ordinary.</span>
            </h1>
            <div className="hero-description">
              <span className="short-line" />
              <p>
                不止于所见，
                <br />
                让想象成为有感知的设计。
              </p>
            </div>
            <a className="pill-button primary" href="#work">
              探索我的作品 <Arrow diagonal />
            </a>
          </div>
          <div className="hero-bottom shell">
            <a className="scroll-link" href="#about">
              <span className="scroll-circle">↓</span> 向下探索{" "}
              <span className="muted">SCROLL TO DISCOVER</span>
            </a>
            <span className="hero-roles">
              VISUAL DESIGN <i /> AI EXPLORATION <i /> BRAND IDENTITY
            </span>
            {!videoError && (
              <button
                className="video-toggle"
                onClick={toggleVideo}
                aria-label={playing ? "暂停背景视频" : "播放背景视频"}
              >
                <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>{" "}
                {playing ? "PAUSE" : "PLAY"}
              </button>
            )}
          </div>
        </section>

        <div className="discipline-strip" aria-hidden="true">
          <div className="shell">
            <span>VISUAL DESIGN</span>
            <b>✳</b>
            <span>AI EXPLORATION</span>
            <b>✳</b>
            <span>BRAND IDENTITY</span>
            <b>✳</b>
            <span>BEYOND THE ORDINARY</span>
          </div>
        </div>

        <section
          className="about section-space shell"
          id="about"
          aria-labelledby="about-title"
        >
          <SectionLabel number="01">ABOUT ME / 关于我</SectionLabel>
          <div className="about-grid">
            <div
              className="portrait-card"
              role="img"
              aria-label="Fubuki 字母肖像，待补充个人照片"
            >
              <div className="portrait-top">
                <span>
                  THE PERSON
                  <br />
                  BEHIND THE PIXELS.
                </span>
                <span>↗</span>
              </div>
              <div className="portrait-monogram" aria-hidden="true">
                F<span>.</span>
              </div>
              <div className="portrait-bottom">
                <span>FUBUKI</span>
                <span>
                  CREATIVE MIND,
                  <br />
                  CURIOUS SOUL.
                </span>
              </div>
            </div>
            <div className="about-copy">
              <div className="eyebrow muted">A LITTLE ABOUT MY WORLD</div>
              <h2 id="about-title">
                你好，我是 <span className="serif">Fubuki.</span>
                <br />
                让创意，有迹可循。
              </h2>
              <div className="role-tags">
                {profile.roles.map((role) => (
                  <span key={role}>{role}</span>
                ))}
              </div>
              <p className="about-description">{profile.description}</p>
              <p className="motto">「{profile.motto}」</p>
              <div className="experience-row">
                <span className="eyebrow muted">MY JOURNEY</span>
                <div>
                  <strong>保持好奇，持续探索</strong>
                  <p>完整履历即将补充 · 在这里记录我的设计经历。</p>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="about-stats">
                <div>
                  <strong>
                    03<span> /</span>
                  </strong>
                  <span>创作方向</span>
                </div>
                <div>
                  <strong>
                    {String(projects.length).padStart(2, "0")}
                    <span> /</span>
                  </strong>
                  <span>概念作品展示</span>
                </div>
                <div>
                  <strong>∞</strong>
                  <span>关于设计的可能</span>
                </div>
              </div>
              <a className="text-link" href={`mailto:${profile.email}`}>
                {profile.email} <Arrow diagonal />
              </a>
            </div>
          </div>
        </section>

        <section
          className="work section-space shell"
          id="work"
          aria-labelledby="work-title"
        >
          <SectionLabel number="02">SELECTED WORK / 精选作品</SectionLabel>
          <div className="section-heading">
            <div>
              <h2 id="work-title">
                一些想法，
                <br />
                一些<span className="serif">新的可能。</span>
              </h2>
              <p>在视觉、品牌与技术的交汇处，留下创作的痕迹。</p>
            </div>
            <span className="work-aside">
              A SELECTION OF
              <br />
              IDEAS & EXPERIMENTS
              <br />
              <span>— CONCEPT COLLECTION</span>
            </span>
          </div>
          <div className="work-toolbar">
            <div className="filters" role="group" aria-label="作品分类">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={filter === item ? "selected" : ""}
                >
                  {item}
                  {item === "全部" && <sup>03</sup>}
                </button>
              ))}
            </div>
            <span className="work-count" aria-live="polite">
              {String(visibleProjects.length).padStart(2, "0")} PROJECTS
            </span>
          </div>
          <div
            className={`project-grid ${filter !== "全部" ? "is-filtered" : ""}`}
          >
            {visibleProjects.map((project, index) => (
              <button
                key={project.id}
                className={`project-card ${project.className}`}
                onClick={() => setSelectedProject(project)}
                aria-label={`查看 ${project.title} 项目详情`}
              >
                <div className="project-visual">
                  <img
                    src={project.image}
                    alt={project.alt}
                    loading="lazy"
                    width="1200"
                    height="900"
                  />
                  <span className="project-badge">
                    概念展示 / {project.year}
                  </span>
                  <span className="project-open">
                    <Arrow diagonal />
                  </span>
                  {project.id === "form" && (
                    <div className="form-overlay" aria-hidden="true">
                      <span>
                        EXPERIMENTAL FORMS
                        <br />
                        AN EXPLORATION IN LIGHT
                      </span>
                      <strong>
                        FORM<span>®</span>
                      </strong>
                      <span>NOTHING IS ORDINARY.</span>
                    </div>
                  )}
                </div>
                <div className="project-caption">
                  <div>
                    <div className="eyebrow muted">{project.disciplines}</div>
                    <h3>{project.title}</h3>
                    <p>{project.subtitle}</p>
                  </div>
                  <span className="project-number">/{project.number}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="collection-note">
            <span className="live-dot" /> 灵感持续生长中，更多真实作品即将加入。
          </p>
        </section>

        <section
          className="expertise section-space"
          id="expertise"
          aria-labelledby="expertise-title"
        >
          <div className="shell">
            <SectionLabel number="03">WHAT I BRING / 我的优势</SectionLabel>
            <div className="section-heading">
              <h2 id="expertise-title">
                感性的创意，
                <br />
                <span className="serif">理性的表达。</span>
              </h2>
              <p>
                不止创造好看的画面。
                <br />
                更关注每一个设计背后的逻辑与可能。
              </p>
            </div>
            <div className="capability-grid">
              {capabilities.map((item) => (
                <article className="capability-card" key={item.number}>
                  <div className="capability-top">
                    <Mark type={item.icon} />
                    <span>/{item.number}</span>
                  </div>
                  <div className="eyebrow muted">{item.en}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <div className="capability-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="process-line">
              <span>从想法，到发生。</span>
              <p>
                DISCOVER <span>↗</span> EXPLORE <span>↗</span> CREATE{" "}
                <span>↗</span> REFINE
              </p>
            </div>
          </div>
        </section>

        <section
          className="contact"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="shell contact-inner">
            <SectionLabel number="04">LET’S CONNECT / 保持联系</SectionLabel>
            <div className="contact-main">
              <div className="eyebrow">
                <span className="live-dot" /> ALWAYS OPEN TO NEW POSSIBILITIES
              </div>
              <h2 id="contact-title">
                Great things
                <br />
                start with a <span className="serif">hello.</span>
              </h2>
              <div className="contact-bottom">
                <p>
                  有个想法，或只是想打个招呼？
                  <br />
                  <span>期待与你一起，让下一个灵感发生。</span>
                </p>
                <a
                  className="pill-button primary"
                  href={`mailto:${profile.email}`}
                >
                  聊聊你的想法 <Arrow diagonal />
                </a>
              </div>
              <div className="email-line">
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
                <button onClick={copyEmail} aria-label="复制邮箱地址">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="8"
                      y="8"
                      width="12"
                      height="13"
                      rx="2"
                      stroke="currentColor"
                    />
                    <path d="M15 8V3H3v13h5" stroke="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
            <footer>
              <a className="wordmark" href="#home">
                fubuki<span>®</span>
              </a>
              <span>
                © {new Date().getFullYear()} FUBUKI. MADE WITH CURIOSITY.
              </span>
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GITHUB <Arrow diagonal />
              </a>
              <a href="#home" className="back-top">
                回到顶部 ↑
              </a>
            </footer>
          </div>
        </section>
      </main>
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
      <ProjectDialog
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </>
  );
}
