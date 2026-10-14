import { useEffect, useRef, useState } from "react";
import {
  achievements,
  education,
  profile,
  publications,
  researchInterests,
  researchRecords,
  skills,
} from "./content";

const navigation = [
  { id: "about", label: "关于我" },
  { id: "research", label: "科研与学习" },
  { id: "achievements", label: "成果与荣誉" },
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
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: 0 },
    );
    document
      .querySelectorAll("main > section[id]")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
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

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#main">
        跳转到内容
      </a>
      <header className="site-header">
        <div className="header-inner shell">
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
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <a className="nav-contact" href="#contact" onClick={closeMenu}>
              联系我 <Arrow diagonal />
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="shell hero-content">
            <div className="hero-copy">
              <div className="eyebrow hero-eyebrow">
                <span className="live-dot" /> ACADEMIC PROFILE / 2026
              </div>
              <h1 id="hero-title">
              吹雪<span className="accent-text">。</span>
              </h1>
              <p className="hero-lead">
              广东技术师范大学
                <br />
              电气工程及其自动化专业本科生
              </p>
              <div className="hero-actions">
                <a className="pill-button primary" href="#research">
                  查看科研记录 <Arrow diagonal />
                </a>
                <a className="quiet-link" href="#about">
                  认识我 <Arrow />
                </a>
              </div>
            </div>
            <aside className="hero-panel" aria-label="个人研究概览">
              <div className="panel-topline">
                <span>PROFILE / 001</span>
                <span className="panel-status">
                  <i /> AVAILABLE TO LEARN
                </span>
              </div>
              <div className="panel-rule" />
              <p className="panel-kicker">ACHIEVEMENTS / 成果概览</p>
              <div className="focus-list">
                {[
                  `${publications.length} 篇会议论文`,
                  `${researchRecords.length} 项科研经历`,
                  `${achievements.length} 项竞赛与荣誉`,
                ].map((summary, index) => (
                  <div className="focus-item" key={summary}>
                    <span>0{index + 1}</span>
                    <strong>{summary}</strong>
                  </div>
                ))}
              </div>
              <div className="panel-footer">
                <span>广东技术师范大学</span>
                <span>GPA 3.5 / 5.0</span>
              </div>
            </aside>
          </div>
          <div className="hero-bottom shell">
            <a className="scroll-link" href="#about">
              <span className="scroll-circle">↓</span> 向下了解
            </a>
            <span className="hero-meta">ISAC · RADAR · SIMULATION</span>
          </div>
        </section>

        <section className="about section-space shell" id="about" aria-labelledby="about-title">
          <SectionLabel number="01">ABOUT / 关于我</SectionLabel>
          <div className="section-heading about-heading">
            <div>
              <p className="section-kicker">PROFILE / 个人信息</p>
              <h2 id="about-title">
                广东技术师范大学，
                <br />
                <span className="accent-text">电气工程及其自动化专业本科生。</span>
              </h2>
            </div>
          </div>
          <div className="profile-grid">
            <div className="profile-details">
              <p className="about-description">{profile.description}</p>
              <dl className="academic-details">
                <div>
                  <dt>学校</dt>
                  <dd>{profile.university}</dd>
                </div>
                <div>
                  <dt>专业</dt>
                  <dd>{profile.major}</dd>
                </div>
                <div>
                  <dt>阶段</dt>
                  <dd>{profile.grade}</dd>
                </div>
                <div>
                  <dt>邮箱</dt>
                  <dd><a href={`mailto:${profile.email}`}>{profile.email}</a></dd>
                </div>
                <div>
                  <dt>GitHub</dt>
                  <dd>
                    <a href={profile.github} target="_blank" rel="noopener noreferrer">
                      {profile.handle} <Arrow diagonal />
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="education-strip">
            <div className="strip-title">EDUCATION / 教育背景</div>
            {education.map((item) => (
              <div className="education-item" key={item.period}>
                <div>
                  <strong>{item.school}</strong>
                  <span>{item.major}</span>
                </div>
                <div>
                  <span>{item.period}</span>
                  <span>{item.details}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="research section-space shell" id="research" aria-labelledby="research-title">
          <SectionLabel number="02">RESEARCH / 科研与学习</SectionLabel>
          <div className="section-heading">
            <div>
              <p className="section-kicker">RESEARCH / 科研经历</p>
              <h2 id="research-title">
                科研经历
              </h2>
            </div>
            <p className="heading-note">围绕通感一体化与雷达感知开展研究、仿真和论文写作。</p>
          </div>
          <div className="interest-block">
            <span className="block-label">研究兴趣</span>
            <div className="interest-list">
              {researchInterests.map((interest) => <span key={interest}>{interest}</span>)}
            </div>
          </div>
          <div className="research-list">
            {researchRecords.map((record, index) => (
              <article className="research-record" key={record.id}>
                <div className="record-index">0{index + 1}</div>
                <div className="record-body">
                  <div className="record-meta">{record.type} <span>/</span> {record.period}</div>
                  <h3>{record.title}</h3>
                  <p className="record-affiliation">{record.affiliation}</p>
                  <p className="record-description">{record.description}</p>
                  <p className="record-result"><span>RESULT</span>{record.result}</p>
                </div>
                <Arrow diagonal className="record-arrow" />
              </article>
            ))}
          </div>
        </section>

        <section className="achievements section-space shell" id="achievements" aria-labelledby="achievements-title">
          <SectionLabel number="03">OUTPUT / 成果与荣誉</SectionLabel>
          <div className="section-heading">
            <div>
              <p className="section-kicker">OUTPUT / 成果与荣誉</p>
              <h2 id="achievements-title">
                成果与荣誉
              </h2>
            </div>
            <p className="heading-note">论文、科研项目、竞赛与培训证书。</p>
          </div>
          <div className="output-grid">
            <div className="publication-card">
              <div className="card-label">PUBLICATION / 论文</div>
              {publications.map((publication) => (
                <div className="publication" key={publication.title}>
                  <span className="publication-year">{publication.year} · {publication.authorship}</span>
                  <h3>{publication.title}</h3>
                  <p>{publication.venue}</p>
                </div>
              ))}
            </div>
            <div className="achievements-card">
              <div className="card-label">AWARDS / 荣誉</div>
              <div className="achievement-list">
                {achievements.map((item) => (
                  <div className="achievement" key={`${item.year}-${item.title}`}>
                    <span>{item.year}</span>
                    <strong>{item.title}</strong>
                    <em>{item.award}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="skills-strip">
            <div className="strip-title">CAPABILITIES / 能力</div>
            <div className="skills-grid">
              {skills.map((skill) => (
                <div className="skill" key={skill.label}>
                  <strong>{skill.label}</strong>
                  <span>{skill.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="contact-title">
          <div className="contact-grid" aria-hidden="true" />
          <div className="shell contact-inner">
            <SectionLabel number="04">CONTACT / 联系方式</SectionLabel>
            <div className="contact-main">
              <div className="eyebrow"><span className="live-dot" /> OPEN TO ACADEMIC EXCHANGE</div>
              <h2 id="contact-title">
                欢迎联系我
              </h2>
              <div className="contact-bottom">
                <p>如果你对通感一体化、雷达感知或学习方法有想法，欢迎发邮件交流。</p>
                <a className="pill-button primary" href={`mailto:${profile.email}`}>
                  邮件联系 <Arrow diagonal />
                </a>
              </div>
              <div className="email-line">
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
                <button onClick={copyEmail} aria-label="复制邮箱地址">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="8" y="8" width="12" height="13" rx="2" stroke="currentColor" />
                    <path d="M15 8V3H3v13h5" stroke="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
            <footer>
              <a className="wordmark" href="#home">吹雪<span className="wordmark-dot">·</span></a>
              <span>© {new Date().getFullYear()} 吹雪 / ACADEMIC HOMEPAGE</span>
              <a href={profile.github} target="_blank" rel="noopener noreferrer">GITHUB <Arrow diagonal /></a>
              <a href="#home" className="back-top">回到顶部 ↑</a>
            </footer>
          </div>
        </section>
      </main>
      <div className={`toast ${toast ? "visible" : ""}`} role="status">{toast}</div>
    </>
  );
}
