import { useEffect, useRef, useState } from "react";
import { profile, researchInterests, researchRecords } from "./content";

const navigation = [
  { id: "about", label: "个人简介" },
  { id: "research", label: "科研与学习" },
];

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

function SectionLabel({ number, children }) {
  return (
    <div className="section-label">
      <span className="section-index">{number}</span>
      <span>{children}</span>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

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
      setToast("邮箱已复制，欢迎交流。");
    } catch {
      setToast(`请手动复制邮箱：${profile.email}`);
    }
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5000);
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
            fubuki
          </a>
          <span className="header-caption">PERSONAL / ACADEMIC HOMEPAGE</span>
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
          <div className="shell hero-content">
            <div className="eyebrow hero-eyebrow">
              <span className="live-dot" /> FUBUKI — LEARNING & RESEARCH
            </div>
            <h1 id="hero-title">
              Stay curious.
              <br />
              Keep <span className="serif">exploring.</span>
            </h1>
            <div className="hero-description">
              <span className="short-line" />
              <p>
                从学习出发，
                <br />
                在问题中寻找研究的方向。
              </p>
            </div>
            <a className="pill-button primary" href="#research">
              科研与学习记录 <Arrow diagonal />
            </a>
          </div>
          <div className="hero-bottom shell">
            <a className="scroll-link" href="#about">
              <span className="scroll-circle">↓</span> 了解更多{" "}
              <span className="muted">SCROLL TO DISCOVER</span>
            </a>
            <span className="hero-roles">
              LEARN <i /> QUESTION <i /> EXPLORE
            </span>
          </div>
        </section>

        <section
          className="about section-space shell"
          id="about"
          aria-labelledby="about-title"
        >
          <SectionLabel number="01">ABOUT / 个人简介</SectionLabel>
          <div className="about-grid">
            <div
              className="portrait-card"
              role="img"
              aria-label="Fubuki 的字母标识"
            >
              <div className="portrait-top">
                <span>
                  LEARNING
                  <br />
                  WITH CURIOSITY.
                </span>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="portrait-monogram" aria-hidden="true">
                F<span>.</span>
              </div>
              <div className="portrait-bottom">
                <span>FUBUKI</span>
                <span>
                  ASK QUESTIONS.
                  <br />
                  SEEK UNDERSTANDING.
                </span>
              </div>
            </div>
            <div className="about-copy">
              <div className="eyebrow muted">A STUDENT, ALWAYS LEARNING</div>
              <h2 id="about-title">
                你好，我是 <span className="serif">{profile.name}.</span>
                <br />
                在学习中，持续探索。
              </h2>
              <div className="role-tags">
                <span>{profile.status}</span>
                <span>{profile.university}</span>
              </div>
              <p className="about-description">{profile.description}</p>
              <p className="motto">{profile.motto}</p>
              <dl className="academic-details">
                <div>
                  <dt>学校</dt>
                  <dd>{profile.university}</dd>
                </div>
                <div>
                  <dt>邮箱</dt>
                  <dd>
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>GitHub</dt>
                  <dd>
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {profile.handle} <Arrow diagonal />
                    </a>
                  </dd>
                </div>
              </dl>
              <a className="text-link" href="#research">
                了解科研与学习记录 <Arrow diagonal />
              </a>
            </div>
          </div>
        </section>

        <section
          className="research section-space shell"
          id="research"
          aria-labelledby="research-title"
        >
          <SectionLabel number="02">
            RESEARCH & LEARNING / 科研与学习
          </SectionLabel>
          <div className="section-heading">
            <div>
              <h2 id="research-title">
                从问题出发，
                <br />
                <span className="serif">记录探索的过程。</span>
              </h2>
              <p>关注学习积累，也关注每一次研究尝试背后的思考。</p>
            </div>
          </div>
          {researchInterests.length > 0 && (
            <div className="research-interests">
              <h3>研究兴趣</h3>
              <div className="role-tags">
                {researchInterests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))}
              </div>
            </div>
          )}
          {researchRecords.length > 0 ? (
            <div className="research-list">
              {researchRecords.map((record) => (
                <article className="research-record" key={record.id}>
                  <div className="eyebrow muted">
                    {record.type}
                    {record.period ? ` / ${record.period}` : ""}
                  </div>
                  <h3>{record.title}</h3>
                  <p>{record.description}</p>
                  {record.href && (
                    <a
                      className="text-link"
                      href={record.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      查看研究资料 <Arrow diagonal />
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="research-empty">
              <div className="eyebrow muted">RESEARCH NOTES</div>
              <h3>研究记录，正在整理中。</h3>
              <p>研究方向、项目经历与成果将陆续更新。</p>
            </div>
          )}
        </section>

        <section
          className="contact"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="shell contact-inner">
            <SectionLabel number="03">CONTACT / 联系方式</SectionLabel>
            <div className="contact-main">
              <div className="eyebrow">
                <span className="live-dot" /> OPEN TO ACADEMIC EXCHANGE
              </div>
              <h2 id="contact-title">
                Let’s share
                <br />
                <span className="serif">ideas.</span>
              </h2>
              <div className="contact-bottom">
                <p>
                  欢迎交流科研思考与学习心得。
                  <br />
                  <span>如果你有相关问题或想法，可以通过邮件联系我。</span>
                </p>
                <a
                  className="pill-button primary"
                  href={`mailto:${profile.email}`}
                >
                  邮件联系 <Arrow diagonal />
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
                fubuki
              </a>
              <span>
                © {new Date().getFullYear()} FUBUKI / PERSONAL HOMEPAGE
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
    </>
  );
}
