/* ================================================================
   UPCAT 2027 MASTER VAULT — script.js
   Website Idea & Concept by Ian Lorenzo Herico
   ================================================================ */

/* ----------------------------------------------------------------
   STATE MANAGEMENT
   ---------------------------------------------------------------- */
let state = {};

const STATE_VERSION = 5;
function migrateState(s) {
  if (!s.dailyQuests)       s.dailyQuests = {};
  if (!s.questLastReset)    s.questLastReset = null;
  if (!s.flashcardDecks)    s.flashcardDecks = {};
  if (!s.wrongAnswers)      s.wrongAnswers = [];
  if (!s.heatmap)           s.heatmap = {};
  if (!s.totalStudyMinutes) s.totalStudyMinutes = 0;
  if (!s.lastActiveSection) s.lastActiveSection = 'dashboard';
  if (!s.sessions)          s.sessions = [];
  if (!s.streakFreezes)     s.streakFreezes = 0;
  if (!s.longestStreak)     s.longestStreak = 0;
  s._version = STATE_VERSION;
  return s;
}
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem('upcat_state_v4') || '{}');
    state = migrateState(raw);
  } catch(e) { state = migrateState({}); }
}
function saveState() {
  try { localStorage.setItem('upcat_state_v4', JSON.stringify(state)); } catch(e) {}
}
loadState();

/* ----------------------------------------------------------------
   LOADER
   ---------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  const fill = document.getElementById('loaderFill');
  const pct  = document.getElementById('loaderPct');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 18 + 4;
    if (p > 100) p = 100;
    fill.style.width = p + '%';
    pct.textContent = Math.round(p) + '%';
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        initAll();
      }, 350);
    }
  }, 80);
});

/* ----------------------------------------------------------------
   THEME
   ---------------------------------------------------------------- */
(function applyStoredTheme() {
  const saved = localStorage.getItem('upcat_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.querySelector('i').className = saved === 'light' ? 'fas fa-sun' : 'fas fa-moon';
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const nxt = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('upcat_theme', nxt);
  document.getElementById('themeBtn').querySelector('i').className = nxt === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

/* ----------------------------------------------------------------
   SECTION NAVIGATION
   ---------------------------------------------------------------- */
function showSection(id, navEl) {
  // deactivate all sections & nav items
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // activate target
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');

  // re-render section-specific grids so fade-up elements are injected
  // into a now-visible DOM, ensuring IntersectionObserver fires correctly
  if (id === 'other-reviewers') renderFolderReviewers();
  if (id === 'reviewers')       renderReviewers();

  // update nav highlight
  if (navEl) {
    navEl.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'"+id+"'")) n.classList.add('active');
    });
  }

  // update topbar title
  const titles = {
    dashboard:'Dashboard', reviewers:'Full Reviewers', 'other-reviewers':'Other Reviewers',
    topics:'Subject Topics',
    plans:'Study Plans', formulas:'Formula Sheet', tasks:'Task Tracker',
    tips:'Exam Tips', achievements:'Achievements', official:'Official Resources',
    mocks:'Mock Tests & Simulations', upg:'UPG Calculator',
    guide:'UPCAT Process Guide', settings:'Settings', credits:'Credits'
  };
  document.getElementById('topbar-title').textContent = titles[id] || 'UPCAT 2027 Master Vault';

  // close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();

  // scroll to top of content
  document.querySelector('.content').scrollTop = 0;
  window.scrollTo({ top: 0 });

  // re-run scroll reveal after display:block reflow settles
  setTimeout(initScrollReveal, 150);
}

/* ----------------------------------------------------------------
   SIDEBAR MOBILE TOGGLE
   ---------------------------------------------------------------- */
// Tracks scroll position so we can restore it after closing the sidebar.
// overflow:hidden on body is broken on iOS Safari — position:fixed is correct.
let _savedScrollY = 0;

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  const isOpen = sb.classList.toggle('open');
  ov.style.display = isOpen ? 'block' : 'none';
  if (isOpen) {
    // Save current scroll position, then lock the body in place
    _savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top      = `-${_savedScrollY}px`;
    document.body.style.width    = '100%';
  } else {
    // Release the body lock and restore scroll position
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.width    = '';
    window.scrollTo(0, _savedScrollY);
  }
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').style.display = 'none';
  // Release body lock and restore scroll position
  document.body.style.position = '';
  document.body.style.top      = '';
  document.body.style.width    = '';
  window.scrollTo(0, _savedScrollY);
}

/* ----------------------------------------------------------------
   COUNTDOWN — Dynamic (targets August 2026)
   ---------------------------------------------------------------- */
function updateCountdown() {
  // UPCAT 2027 is held on August 1–2, 2026 — countdown to Day 1
  const target = new Date('2026-08-01T08:00:00+08:00');
  const now    = new Date();
  const diff   = target - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hrs').textContent  = '00';
    document.getElementById('cd-min').textContent  = '00';
    document.getElementById('cd-sec').textContent  = '00';
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000)  / 60000);
  const secs = Math.floor((diff % 60000)    / 1000);

  const pad = n => String(n).padStart(2, '0');
  document.getElementById('cd-days').textContent = pad(days);
  document.getElementById('cd-hrs').textContent  = pad(hrs);
  document.getElementById('cd-min').textContent  = pad(mins);
  document.getElementById('cd-sec').textContent  = pad(secs);
}
setInterval(updateCountdown, 1000);

/* ----------------------------------------------------------------
   MOTIVATIONAL QUOTES
   ---------------------------------------------------------------- */
const quotes = [
  {text:'"The secret of getting ahead is getting started."', author:'— Mark Twain'},
  {text:'"Education is the most powerful weapon which you can use to change the world."', author:'— Nelson Mandela'},
  {text:'"Success is the sum of small efforts, repeated day in and day out."', author:'— Robert Collier'},
  {text:'"Believe you can and you\'re halfway there."', author:'— Theodore Roosevelt'},
  {text:'"It always seems impossible until it\'s done."', author:'— Nelson Mandela'},
  {text:'"Hard work beats talent when talent doesn\'t work hard."', author:'— Tim Notke'},
  {text:'"The difference between ordinary and extraordinary is that little extra."', author:'— Jimmy Johnson'},
  {text:'"Your dream university is waiting. Every review session brings you closer."', author:'— UPCAT 2027 Vault'},
  {text:'"Magsipag ka. Ang tagumpay ay hindi darating sa tamad."', author:'— Filipino Wisdom'},
  {text:'"Ang edukasyon ang tanging kayamanan na hindi maaaring kunin sa iyo."', author:'— Jose Rizal (paraphrased)'},
  {text:'"Don\'t watch the clock; do what it does. Keep going."', author:'— Sam Levenson'},
  {text:'"Kaya mo \'yan. Huwag sumuko."', author:'— Every Filipino Parent Ever'},
];
let currentQuote = Math.floor(Math.random() * quotes.length);
function nextQuote() {
  currentQuote = (currentQuote + 1) % quotes.length;
  const q = quotes[currentQuote];
  const textEl   = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  textEl.style.opacity = '0';
  setTimeout(() => {
    textEl.textContent   = q.text;
    authorEl.textContent = q.author;
    textEl.style.opacity = '1';
  }, 300);
}
function setRandomQuote() {
  const q = quotes[currentQuote];
  document.getElementById('quote-text').textContent   = q.text;
  document.getElementById('quote-author').textContent = q.author;
}
setInterval(nextQuote, 12000);

/* ----------------------------------------------------------------
   TOAST
   ---------------------------------------------------------------- */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ----------------------------------------------------------------
   REVIEWERS DATA & RENDER
   ---------------------------------------------------------------- */
const reviewers = [
  {
    id:'academic_gateway', title:'Academic Gateway',
    cover:'cover-a', emoji:'🎓',
    desc:'A comprehensive UPCAT reviewer covering all four subtests with clear explanations and well-structured content for serious aspirants.',
    diff:'Medium', time:'20–30 hrs', pages:'~400 pages',
    tags:['All Subjects','Well-Structured','Best for Beginners'], cat:'indigo',
    link:'https://drive.google.com/file/d/1Cywj8OlSsJhQAfyqHlzegiZVJd2uAxfl/view?usp=drivesdk',
    embedId:'1Cywj8OlSsJhQAfyqHlzegiZVJd2uAxfl'
  },
  {
    id:'collegio_advance', title:'Collegio Advance',
    cover:'cover-b', emoji:'📗',
    desc:'A solid all-around reviewer with strong coverage of Language Proficiency, Reading Comprehension, and Science topics aligned with K-12.',
    diff:'Medium', time:'18–25 hrs', pages:'~350 pages',
    tags:['All Subjects','K-12 Aligned','Language Focus'], cat:'emerald',
    link:'https://drive.google.com/file/d/13x0wXIVTF6hd0HFBZ9TzcG93qlMjy6cH/view?usp=drivesdk',
    embedId:'13x0wXIVTF6hd0HFBZ9TzcG93qlMjy6cH'
  },
  {
    id:'maroon_bluebook', title:'Maroon Bluebook 4th Edition',
    cover:'cover-c', emoji:'📘',
    desc:'The classic community favorite. Trusted for its depth in Filipino Language and Reading Comprehension, with detailed explanations across all subtests.',
    diff:'Medium', time:'30–40 hrs', pages:'~400 pages',
    tags:['Classic','Explanation-rich','Most Popular'], cat:'amber',
    link:'https://drive.google.com/file/d/1sCGl08sFqNEFNNEoBXoAliL2HvMM4E0q/view?usp=drivesdk',
    embedId:'1sCGl08sFqNEFNNEoBXoAliL2HvMM4E0q'
  },
  {
    id:'msa', title:'MSA 2024',
    cover:'cover-d', emoji:'🔬',
    desc:'Latest 2024 reviewer aligned with the modern K-12 curriculum. Science and Math heavy with fully updated content and practice sets.',
    diff:'Medium', time:'20–28 hrs', pages:'~290 pages',
    tags:['2024 Updated','K-12 Aligned','Science & Math Focus'], cat:'indigo',
    link:'https://drive.google.com/file/d/1MhXc23EWEopBWVE_c-qCN2rz-vS3gidW/view?usp=drivesdk',
    embedId:'1MhXc23EWEopBWVE_c-qCN2rz-vS3gidW'
  },
];

function renderReviewers() {
  if (!state.reviewerDone) state.reviewerDone = {};
  if (!state.reviewerBookmarks) state.reviewerBookmarks = {};
  document.getElementById('reviewer-grid').innerHTML = reviewers.map(r => {
    const done = state.reviewerDone[r.id];
    const bkm  = state.reviewerBookmarks[r.id];
    const catClass = r.cat === 'emerald' ? 't-emerald' : r.cat === 'amber' ? 't-amber' : 't-indigo';
    return `
    <div class="reviewer-card fade-up">
      <div class="reviewer-cover ${r.cover}">
        <div class="cover-overlay"></div>
        <div class="reviewer-cover-emoji">${r.emoji}</div>
      </div>
      <div class="reviewer-body">
        <div class="reviewer-title">${r.title}</div>
        <div class="reviewer-desc">${r.desc}</div>
        <div class="tags">${r.tags.map(t => `<span class="tag ${catClass}">${t}</span>`).join('')}</div>
        <div class="reviewer-meta">
          <span class="diff-badge ${r.diff==='Hard'?'diff-hard':r.diff==='Medium'?'diff-med':'diff-easy'}">${r.diff}</span>
          <span style="display:flex;gap:12px;align-items:center;font-size:0.74rem;color:var(--text-muted);">
            <span><i class="fas fa-clock" style="margin-right:4px;"></i>${r.time}</span>
            <span><i class="fas fa-file" style="margin-right:4px;"></i>${r.pages}</span>
          </span>
        </div>
        <div class="progress-label"><span>Completion</span><span>${done?'100':'0'}%</span></div>
        <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${done?'100':'0'}%"></div></div>
        <div class="btn-row">
          <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="openPdfModal('${r.embedId}','${r.title}','${r.link}')">
            <i class="fas fa-eye"></i> View PDF
          </button>
          <a href="${r.link}" target="_blank" class="btn btn-ghost" title="Open in new tab"><i class="fas fa-external-link-alt"></i></a>
          <button class="btn ${bkm?'btn-primary':'btn-secondary'}" onclick="toggleBookmark('${r.id}')" title="Bookmark">
            <i class="fas fa-bookmark" style="${bkm?'color:#fbbf24':''}"></i>
          </button>
          <button class="btn ${done?'btn-success':'btn-secondary'}" onclick="toggleReviewer('${r.id}')">
            <i class="fas ${done?'fa-check-circle':'fa-circle'}"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
  initScrollReveal();
}

function openPdfModal(embedId, title, link) {
  const url = `https://drive.google.com/file/d/${embedId}/preview`;
  document.getElementById('pdfModalTitle').textContent = title;
  document.getElementById('pdfModalFrame').src = url;
  document.getElementById('pdfModalNewTab').href = link;
  document.getElementById('pdfModal').classList.add('open');
}
function closePdfModal() {
  document.getElementById('pdfModal').classList.remove('open');
  document.getElementById('pdfModalFrame').src = '';
}
document.getElementById('pdfModal').addEventListener('click', function(e) {
  if (e.target === this) closePdfModal();
});

function toggleReviewer(id) {
  if (!state.reviewerDone) state.reviewerDone = {};
  state.reviewerDone[id] = !state.reviewerDone[id];
  saveState(); renderReviewers(); updateDashboardStats();
  if (state.reviewerDone[id]) {
    recordStudyActivity('reviewer');
    advanceQuest('reviewer', 1);
    showToast('📚 Reviewer marked as complete! +50 XP');
  } else {
    showToast('Reviewer unmarked.');
  }
}
function toggleBookmark(id) {
  if (!state.reviewerBookmarks) state.reviewerBookmarks = {};
  state.reviewerBookmarks[id] = !state.reviewerBookmarks[id];
  saveState(); renderReviewers();
  showToast(state.reviewerBookmarks[id] ? '🔖 Reviewer bookmarked!' : 'Bookmark removed.');
}

/* ----------------------------------------------------------------
   FOLDER REVIEWERS — Other Personally Trusted Reviewers
   These link to Google Drive folders (not embeddable PDFs),
   so they use a folder-specific card layout.
   ---------------------------------------------------------------- */
const folderReviewers = [
  {
    id:'jahjah_cet',
    title:'Jahjah\'s Super Duper Ultra Mega CET Reviewers',
    cover:'cover-folder-a', emoji:'📂',
    desc:'A massive collection of CET reviewer materials personally curated and compiled. Covers a wide range of subjects useful for UPCAT preparation.',
    tags:['Folder Collection','Multi-Subject','Community Pick'], cat:'cyan',
    credit:'Reviewer collection by Jahjah',
    link:'https://drive.google.com/drive/folders/1uBMGBJVbp6bqM7jwLr5yEI-jaoV823jA',
  },
];

function renderFolderReviewers() {
  if (!state.reviewerDone)       state.reviewerDone       = {};
  if (!state.reviewerBookmarks)  state.reviewerBookmarks  = {};
  const grid = document.getElementById('folder-reviewer-grid');
  if (!grid) return;
  grid.innerHTML = folderReviewers.map(r => {
    const done = state.reviewerDone[r.id];
    const bkm  = state.reviewerBookmarks[r.id];
    const catClass = r.cat === 'emerald' ? 't-emerald'
                   : r.cat === 'amber'   ? 't-amber'
                   : r.cat === 'cyan'    ? 't-cyan'
                   : 't-indigo';
    return `
    <div class="reviewer-card fade-up" role="article" aria-label="${r.title}">
      <div class="reviewer-cover ${r.cover}">
        <div class="cover-overlay"></div>
        <div class="reviewer-cover-emoji">${r.emoji}</div>
      </div>
      <div class="reviewer-body">
        <div class="reviewer-title">${r.title}</div>
        <div class="reviewer-desc">${r.desc}</div>
        <div class="tags">${r.tags.map(t => `<span class="tag ${catClass}">${t}</span>`).join('')}</div>
        <div class="reviewer-credit">
          <i class="fas fa-user-circle" style="margin-right:5px;opacity:0.7;"></i>${r.credit}
        </div>
        <div class="progress-label"><span>Completion</span><span>${done ? '100' : '0'}%</span></div>
        <div class="progress-track" style="margin-bottom:14px;">
          <div class="progress-fill" style="width:${done ? '100' : '0'}%"></div>
        </div>
        <div class="btn-row">
          <a href="${r.link}" target="_blank" rel="noopener noreferrer"
             class="btn btn-primary" style="flex:1;justify-content:center;text-decoration:none;"
             aria-label="Open ${r.title} in Google Drive">
            <i class="fas fa-folder-open"></i> Open Folder
          </a>
          <button class="btn ${bkm ? 'btn-primary' : 'btn-secondary'}"
                  onclick="toggleFolderBookmark('${r.id}')" title="Bookmark" aria-label="Bookmark ${r.title}">
            <i class="fas fa-bookmark" style="${bkm ? 'color:#fbbf24' : ''}"></i>
          </button>
          <button class="btn ${done ? 'btn-success' : 'btn-secondary'}"
                  onclick="toggleFolderReviewer('${r.id}')" title="${done ? 'Mark incomplete' : 'Mark complete'}"
                  aria-label="${done ? 'Mark incomplete' : 'Mark complete'}">
            <i class="fas ${done ? 'fa-check-circle' : 'fa-circle'}"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
  initScrollReveal();
}

function toggleFolderReviewer(id) {
  if (!state.reviewerDone) state.reviewerDone = {};
  state.reviewerDone[id] = !state.reviewerDone[id];
  saveState(); renderFolderReviewers(); updateDashboardStats();
  showToast(state.reviewerDone[id] ? '📂 Folder reviewer marked as complete! +50 XP' : 'Reviewer unmarked.');
}

function toggleFolderBookmark(id) {
  if (!state.reviewerBookmarks) state.reviewerBookmarks = {};
  state.reviewerBookmarks[id] = !state.reviewerBookmarks[id];
  saveState(); renderFolderReviewers();
  showToast(state.reviewerBookmarks[id] ? '🔖 Reviewer bookmarked!' : 'Bookmark removed.');
}

/* ----------------------------------------------------------------
   SUBJECTS / TOPICS
   ---------------------------------------------------------------- */
const subjects = [
  { id:'math', name:'Mathematics', icon:'📐', color:'#6366f1', bg:'var(--accent-dim)', topics:['Real Number System','Algebraic Expressions','Linear Equations','Quadratic Equations','Systems of Equations','Inequalities','Functions & Relations','Exponents & Radicals','Logarithms','Sequences & Series','Plane Geometry','Solid Geometry','Coordinate Geometry','Trigonometry Basics','Trigonometric Identities','Combinatorics & Probability','Statistics & Data Analysis','Word Problems'] },
  { id:'bio', name:'Biology', icon:'🧬', color:'#10b981', bg:'var(--emerald-dim)', topics:['Cell Biology & Structure','Cell Division (Mitosis/Meiosis)','Genetics & Heredity','Evolution & Natural Selection','Ecology & Ecosystems','Human Anatomy','Photosynthesis & Respiration','Biodiversity & Classification','Animal Systems','Plant Biology'] },
  { id:'chem', name:'Chemistry', icon:'⚗️', color:'#06b6d4', bg:'var(--cyan-dim)', topics:['Atomic Structure','Periodic Table & Trends','Chemical Bonding','Stoichiometry & Molar Mass','Chemical Reactions','Acids, Bases & Salts','Gas Laws','Solutions & Concentration','Thermochemistry','Electrochemistry Basics'] },
  { id:'phys', name:'Physics', icon:'⚡', color:'#8b5cf6', bg:'var(--purple-dim)', topics:['Kinematics (Motion)','Dynamics (Newton\'s Laws)','Work, Energy & Power','Momentum & Impulse','Waves & Sound','Optics & Light','Electricity & Circuits','Magnetism','Modern Physics Basics','Thermodynamics'] },
  { id:'earth', name:'Earth Science', icon:'🌏', color:'#f59e0b', bg:'var(--amber-dim)', topics:['Plate Tectonics','Rock Cycle & Minerals','Earthquakes & Volcanoes','Atmosphere & Weather','Climate & Climate Change','Hydrosphere & Water Cycle','Solar System & Universe','Geologic Time Scale','Natural Hazards','Earth\'s Interior'] },
  { id:'fil', name:'Filipino', icon:'🇵🇭', color:'#f43f5e', bg:'var(--rose-dim)', topics:['Wika at Gramatika','Tayutay at Pagsasalita','Karunungang-Bayan (Proverbs)','Maikling Kwento','Tula at Pagtula','Sanaysay at Paksa','Konotasyon at Denotasyon','Wikang Pormal at Impormal','Pagbabago ng Kahulugan','Panitikang Pilipino'] },
  { id:'eng', name:'English Language', icon:'📖', color:'#818cf8', bg:'var(--accent-dim)', topics:['Grammar & Usage','Sentence Structure','Vocabulary in Context','Idioms & Expressions','Analogies','Error Identification','Paragraph Organization','Critical Thinking in Text','Figurative Language','Writing Conventions'] },
  { id:'rc', name:'Reading Comprehension', icon:'📚', color:'#34d399', bg:'var(--emerald-dim)', topics:['Main Idea & Theme','Inference & Implication','Fact vs Opinion','Vocabulary from Context','Author\'s Purpose & Tone','Text Structure Analysis','Critical Evaluation','Comparative Reading','Speed Reading Techniques','Summary & Synthesis'] },
];

function renderTopics() {
  if (!state.topics) state.topics = {};
  document.getElementById('topics-container').innerHTML = subjects.map(s => {
    const done = s.topics.filter(t => state.topics[s.id+'::'+t]).length;
    const pct = Math.round((done/s.topics.length)*100);
    return `
    <div class="subject-block fade-up" id="sb-${s.id}">
      <div class="subject-header" onclick="toggleSubject('${s.id}')">
        <div class="subject-icon" style="background:${s.bg};color:${s.color};">${s.icon}</div>
        <div class="subject-info">
          <div class="subject-name">${s.name}</div>
          <div class="subject-count">${done}/${s.topics.length} topics · ${pct}% complete</div>
        </div>
        <div style="width:80px;margin-right:12px;">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${s.color},${s.color}88)"></div></div>
        </div>
        <i class="fas fa-chevron-down subject-chevron"></i>
      </div>
      <div class="subject-body">
        ${s.topics.map(t => {
          /* Fix #4 & #9: Use a data attribute instead of injecting the raw key
             string into an onclick="..." attribute. This is safe for ANY topic
             name including those with apostrophes (Earth's Interior), quotes,
             or any other special characters. */
          const key     = s.id + '::' + t;
          const isDone  = !!state.topics[key];
          // Escape the key for safe placement in a data-* attribute value
          const safeKey = key.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
          return `<div class="topic-item ${isDone?'done':''}" data-topic-key="${safeKey}">
            <div class="topic-check">${isDone?'✓':''}</div>
            <span class="topic-name">${t}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  initScrollReveal();
}
function toggleSubject(id) { document.getElementById('sb-'+id).classList.toggle('open'); }
function toggleTopic(key) {
  if (!state.topics) state.topics = {};
  state.topics[key] = !state.topics[key];
  saveState(); renderTopics(); updateDashboardStats();
  if (state.topics[key]) {
    recordStudyActivity('topic');
    advanceQuest('topics', 1);
    showToast('✅ Topic checked! +10 XP');
  } else {
    showToast('Topic unchecked.');
  }
}

/* Fix #9: Single delegated click listener on the topics container.
   Handles ALL topic items — no matter what characters are in the topic
   name — by reading the key from the element's dataset instead of
   evaluating an inline JS string. Attached once at DOMContentLoaded. */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('topics-container');
  if (container) {
    container.addEventListener('click', e => {
      const item = e.target.closest('.topic-item[data-topic-key]');
      if (item) toggleTopic(item.dataset.topicKey);
    });
  }
});

/* ----------------------------------------------------------------
   STUDY PLANS
   ---------------------------------------------------------------- */
const plans = [
  { id:'p3', title:'3-Month Master Plan', intensity:'10–15 hrs/week · Balanced', phases:[
    {label:'Month 1',desc:'Foundation building. Review all subjects systematically. Target 2–3 subjects per week.',hrs:'~60 hrs'},
    {label:'Month 2',desc:'Deep dive into weak areas. Formula memorization and drills.',hrs:'~70 hrs'},
    {label:'Month 3',desc:'Full mock tests, error review, and final confidence building.',hrs:'~60 hrs'},
  ]},
  { id:'p2', title:'2-Month Intensive Plan', intensity:'20+ hrs/week · Intensive', phases:[
    {label:'Weeks 1–3',desc:'Rapid content review. 3 subjects per week. Speed-reading reviewers.',hrs:'~70 hrs'},
    {label:'Weeks 4–5',desc:'Formula and concept mastery. Daily formula quizzes.',hrs:'~50 hrs'},
    {label:'Weeks 6–7',desc:'Full mock test simulation. 3 complete tests.',hrs:'~60 hrs'},
    {label:'Week 8',desc:'Rest, light review, and confidence building.',hrs:'~20 hrs'},
  ]},
  { id:'p1', title:'1-Month Final Push Plan', intensity:'30+ hrs/week · Extreme', phases:[
    {label:'Week 1',desc:'Emergency content triage — focus only on highest-yield topics.',hrs:'~30 hrs'},
    {label:'Week 2',desc:'Mock test blitz. 2 full tests. Score and analyze.',hrs:'~30 hrs'},
    {label:'Week 3',desc:'Targeted error drilling. Filipino and RC intensive.',hrs:'~30 hrs'},
    {label:'Week 4',desc:'Light review, sleep optimization, exam day prep.',hrs:'~20 hrs'},
  ]},
];
function renderPlans() {
  document.getElementById('plans-container').innerHTML = plans.map(p => {
    const sel = state.activePlan === p.id;
    return `
    <div class="plan-card ${sel?'selected':''}" onclick="activatePlan('${p.id}')">
      ${sel?'<div style="font-size:0.68rem;color:var(--accent-2);margin-bottom:8px;font-weight:700;letter-spacing:0.1em;">✦ ACTIVE PLAN</div>':''}
      <div class="plan-title">${p.title}</div>
      <div class="plan-intensity"><i class="fas fa-fire" style="color:var(--amber);margin-right:5px;"></i>${p.intensity}</div>
      <div class="timeline">
        ${p.phases.map(ph => `
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-content"><span class="tl-label">${ph.label}</span> — ${ph.desc} <span class="tl-hours">${ph.hrs}</span></div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}
function activatePlan(id) {
  state.activePlan = state.activePlan === id ? null : id;
  saveState(); renderPlans(); updateDashboardStats();
  showToast(state.activePlan ? '🗓️ Study plan activated! +25 XP' : 'Plan deactivated.');
}

/* ----------------------------------------------------------------
   FORMULAS — Expanded with all categories
   ---------------------------------------------------------------- */
const formulas = [
  /* ALGEBRA */
  { cat:'Algebra', name:'Quadratic Formula', eq:'x = (−b ± √(b²−4ac)) / 2a', note:'For ax² + bx + c = 0' },
  { cat:'Algebra', name:'Discriminant', eq:'D = b² − 4ac', note:'D>0: 2 real roots; D=0: 1 root; D<0: no real roots' },
  { cat:'Algebra', name:'Slope of a Line', eq:'m = (y₂−y₁) / (x₂−x₁)', note:'Rise over run' },
  { cat:'Algebra', name:'Slope-Intercept Form', eq:'y = mx + b', note:'m = slope, b = y-intercept' },
  { cat:'Algebra', name:'Sum of Arithmetic Series', eq:'Sₙ = n/2 × (a₁ + aₙ)', note:'Also Sₙ = n/2 × [2a₁ + (n−1)d]' },
  { cat:'Algebra', name:'General Arithmetic Term', eq:'aₙ = a₁ + (n−1)d', note:'d = common difference' },
  { cat:'Algebra', name:'Sum of Geometric Series', eq:'Sₙ = a₁(1−rⁿ) / (1−r)', note:'r ≠ 1' },
  { cat:'Algebra', name:'General Geometric Term', eq:'aₙ = a₁ · rⁿ⁻¹', note:'r = common ratio' },
  { cat:'Algebra', name:'Compound Interest', eq:'A = P(1 + r/n)^(nt)', note:'P = principal, r = rate, n = compounding freq, t = time' },
  { cat:'Algebra', name:'Simple Interest', eq:'I = PRT', note:'P = principal, R = rate, T = time' },

  /* GEOMETRY */
  { cat:'Geometry', name:'Distance Formula', eq:'d = √((x₂−x₁)² + (y₂−y₁)²)', note:'Distance between two points' },
  { cat:'Geometry', name:'Midpoint Formula', eq:'M = ((x₁+x₂)/2, (y₁+y₂)/2)', note:'Midpoint of a segment' },
  { cat:'Geometry', name:'Pythagorean Theorem', eq:'a² + b² = c²', note:'c = hypotenuse' },
  { cat:'Geometry', name:'Area of Triangle', eq:'A = ½ × base × height', note:"Also A = √[s(s−a)(s−b)(s−c)] (Heron's formula)" },
  { cat:'Geometry', name:'Area of Circle', eq:'A = πr²', note:'r = radius' },
  { cat:'Geometry', name:'Circumference', eq:'C = 2πr = πd', note:'d = diameter' },
  { cat:'Geometry', name:'Area of Rectangle', eq:'A = l × w', note:'l = length, w = width' },
  { cat:'Geometry', name:'Area of Trapezoid', eq:'A = ½(b₁ + b₂) × h', note:'b₁, b₂ = parallel bases' },
  { cat:'Geometry', name:'Volume of Sphere', eq:'V = (4/3)πr³', note:'Surface area: SA = 4πr²' },
  { cat:'Geometry', name:'Volume of Cylinder', eq:'V = πr²h', note:'Lateral area: LA = 2πrh' },
  { cat:'Geometry', name:'Volume of Cone', eq:'V = (1/3)πr²h', note:'Slant height: l = √(r²+h²)' },
  { cat:'Geometry', name:'Volume of Rectangular Prism', eq:'V = l × w × h', note:'SA = 2(lw + lh + wh)' },

  /* TRIGONOMETRY */
  { cat:'Trigonometry', name:'SOH-CAH-TOA', eq:'sin θ = opp/hyp; cos θ = adj/hyp; tan θ = opp/adj', note:'Basic trig ratios' },
  { cat:'Trigonometry', name:'Pythagorean Identity', eq:'sin²θ + cos²θ = 1', note:'Also: 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ' },
  { cat:'Trigonometry', name:'Law of Sines', eq:'a/sin A = b/sin B = c/sin C', note:'For non-right triangles' },
  { cat:'Trigonometry', name:'Law of Cosines', eq:'c² = a² + b² − 2ab cos C', note:'Generalizes Pythagorean theorem' },
  { cat:'Trigonometry', name:'Double Angle (sine)', eq:'sin 2θ = 2 sin θ cos θ', note:'Identity' },
  { cat:'Trigonometry', name:'Double Angle (cosine)', eq:'cos 2θ = cos²θ − sin²θ = 1 − 2sin²θ', note:'Identity' },

  /* STATISTICS & PROBABILITY */
  { cat:'Statistics', name:'Mean (Average)', eq:'x̄ = Σxᵢ / n', note:'Sum of values divided by count' },
  { cat:'Statistics', name:'Weighted Mean', eq:'x̄ = Σ(wᵢ · xᵢ) / Σwᵢ', note:'Used with different weights' },
  { cat:'Statistics', name:'Population Variance', eq:'σ² = Σ(xᵢ − μ)² / N', note:'μ = population mean' },
  { cat:'Statistics', name:'Standard Deviation', eq:'σ = √[Σ(xᵢ − x̄)² / n]', note:'Measure of spread' },
  { cat:'Statistics', name:'Permutations', eq:'P(n,r) = n! / (n−r)!', note:'Ordered arrangements' },
  { cat:'Statistics', name:'Combinations', eq:'C(n,r) = n! / [r!(n−r)!]', note:'Unordered selections' },
  { cat:'Statistics', name:'Probability', eq:'P(A) = favorable outcomes / total outcomes', note:'0 ≤ P(A) ≤ 1' },
  { cat:'Statistics', name:'Addition Rule', eq:'P(A∪B) = P(A) + P(B) − P(A∩B)', note:'For any two events' },
  { cat:'Statistics', name:'Multiplication Rule', eq:'P(A∩B) = P(A) × P(B|A)', note:'B|A = B given A' },

  /* PHYSICS */
  { cat:'Physics', name:"Newton's Second Law", eq:'F = ma', note:'Force = mass × acceleration' },
  { cat:'Physics', name:'Kinematic — Velocity', eq:'v = v₀ + at', note:'v₀ = initial velocity' },
  { cat:'Physics', name:'Kinematic — Displacement', eq:'d = v₀t + ½at²', note:'Under constant acceleration' },
  { cat:'Physics', name:'Velocity Squared', eq:'v² = v₀² + 2ad', note:'Time-independent kinematics' },
  { cat:'Physics', name:'Work', eq:'W = Fd cos θ', note:'θ = angle between force and displacement' },
  { cat:'Physics', name:'Kinetic Energy', eq:'KE = ½mv²', note:'m = mass, v = velocity' },
  { cat:'Physics', name:'Potential Energy (gravity)', eq:'PE = mgh', note:'g ≈ 9.8 m/s²' },
  { cat:'Physics', name:'Power', eq:'P = W/t = Fv', note:'Watts = Joules/second' },
  { cat:'Physics', name:'Speed', eq:'speed = distance / time', note:'Scalar quantity' },
  { cat:'Physics', name:'Momentum', eq:'p = mv', note:'Conserved in closed system' },
  { cat:'Physics', name:"Ohm's Law", eq:'V = IR', note:'Voltage = Current × Resistance' },
  { cat:'Physics', name:'Wave Speed', eq:'v = fλ', note:'f = frequency, λ = wavelength' },

  /* CHEMISTRY */
  { cat:'Chemistry', name:'Ideal Gas Law', eq:'PV = nRT', note:'R = 8.314 J/mol·K (or 0.0821 L·atm/mol·K)' },
  { cat:'Chemistry', name:'Molarity', eq:'M = moles solute / liters solution', note:'Units: mol/L' },
  { cat:'Chemistry', name:'Percent Yield', eq:'% Yield = (actual / theoretical) × 100%', note:'Always ≤ 100% ideally' },
  { cat:'Chemistry', name:'pH Formula', eq:'pH = −log[H⁺]', note:'pOH = −log[OH⁻]; pH + pOH = 14' },
  { cat:'Chemistry', name:"Boyle's Law", eq:'P₁V₁ = P₂V₂', note:'Constant temperature' },
  { cat:'Chemistry', name:"Charles's Law", eq:'V₁/T₁ = V₂/T₂', note:'Constant pressure; T in Kelvin' },
  { cat:'Chemistry', name:'Mole Concept', eq:'1 mole = 6.022 × 10²³ particles', note:"Avogadro's number" },
  { cat:'Chemistry', name:'Molar Mass Use', eq:'moles = mass (g) / molar mass (g/mol)', note:'Fundamental stoichiometry' },
  { cat:'Chemistry', name:'Density', eq:'D = m / V', note:'mass per unit volume' },
  { cat:'Chemistry', name:'Percent Composition', eq:'% = (mass of element / molar mass of compound) × 100', note:'By mass' },
];

let activeFormulaFilter = 'All';
function renderFormulas(search = '') {
  const cats = ['All', ...new Set(formulas.map(f => f.cat))];
  document.getElementById('formula-filters').innerHTML = cats.map(c =>
    `<div class="filter-pill ${activeFormulaFilter===c?'active':''}" onclick="setFormulaFilter('${c}')">${c}</div>`
  ).join('');
  if (!state.formulaBookmarks) state.formulaBookmarks = {};
  let list = formulas.filter(f => activeFormulaFilter === 'All' || f.cat === activeFormulaFilter);
  if (search) list = list.filter(f => f.name.toLowerCase().includes(search) || f.eq.toLowerCase().includes(search) || f.cat.toLowerCase().includes(search));
  document.getElementById('formula-grid').innerHTML = list.length ? list.map(f => {
    const bk = state.formulaBookmarks[f.name];
    return `
    <div class="formula-card fade-up">
      <div class="formula-actions">
        <div class="formula-action-btn ${bk?'bookmarked':''}" onclick="bookmarkFormula('${f.name}')" title="Bookmark"><i class="fas fa-bookmark"></i></div>
        <div class="formula-action-btn" onclick="copyFormula(\`${f.eq}\`)" title="Copy"><i class="fas fa-copy"></i></div>
      </div>
      <div class="formula-cat">${f.cat}</div>
      <div class="formula-name">${f.name}</div>
      <div class="formula-eq">${f.eq}</div>
      ${f.note ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;font-style:italic;">${f.note}</div>` : ''}
    </div>`;
  }).join('') : '<div style="text-align:center;padding:40px;color:var(--text-muted);">No formulas found.</div>';
  initScrollReveal();
}
function setFormulaFilter(cat) {
  activeFormulaFilter = cat;
  renderFormulas(document.getElementById('globalSearch').value);
}
function copyFormula(eq) {
  navigator.clipboard.writeText(eq).then(() => showToast('⚡ Formula copied!'));
}
function bookmarkFormula(name) {
  if (!state.formulaBookmarks) state.formulaBookmarks = {};
  state.formulaBookmarks[name] = !state.formulaBookmarks[name];
  saveState(); renderFormulas();
  showToast(state.formulaBookmarks[name] ? '🔖 Formula bookmarked!' : 'Bookmark removed.');
}

/* ----------------------------------------------------------------
   TASKS
   ---------------------------------------------------------------- */
function renderTasks() {
  if (!state.tasks) state.tasks = [];
  const list = document.getElementById('task-list');
  if (!state.tasks.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:0.82rem;">No tasks yet. Add your first study task above!</div>';
    return;
  }
  list.innerHTML = state.tasks.map((t, i) => `
  <div class="task-item ${t.done?'completed':''}">
    <button class="task-check-btn" onclick="toggleTask(${i})">✓</button>
    <span class="task-text">${t.text}</span>
    <span class="priority-badge pri-${t.priority}">${t.priority==='high'?'🔴 High':t.priority==='med'?'🟡 Med':'🟢 Low'}</span>
    <button class="task-del-btn" onclick="deleteTask(${i})"><i class="fas fa-trash"></i></button>
  </div>`).join('');
}
function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  if (!state.tasks) state.tasks = [];
  state.tasks.unshift({ text, priority: document.getElementById('taskPriority').value, done: false, id: Date.now() });
  input.value = '';
  saveState(); renderTasks(); updateDashboardStats();
  recordStudyActivity('task_add');
  advanceQuest('task_add', 1);
  showToast('✅ Task added! +5 XP');
}
function toggleTask(i) {
  state.tasks[i].done = !state.tasks[i].done;
  saveState(); renderTasks(); updateDashboardStats();
  if (state.tasks[i].done) {
    recordStudyActivity('task');
    advanceQuest('task_done', 1);
    showToast('✅ Task complete! +15 XP');
  } else {
    showToast('Task unchecked.');
  }
}
function deleteTask(i) {
  state.tasks.splice(i, 1);
  saveState(); renderTasks(); updateDashboardStats();
  showToast('🗑️ Task removed.');
}

/* ----------------------------------------------------------------
   EXAM TIPS
   ---------------------------------------------------------------- */
const tips = [
  { title:'Master the Art of Elimination', text:'On multiple-choice questions, eliminate obviously wrong answers first. Narrowing to 2 choices gives you a 50% chance even when unsure.' },
  { title:'Time Management is Everything', text:'UPCAT has strict time limits. Practice with a timer. Allocate roughly 45 seconds per item. Skip and return to hard questions.' },
  { title:'Prioritize High-Yield Topics', text:'Focus on Math (Algebra, Geometry), Science (Biology, Chemistry basics), and Reading Comprehension — these have the most items.' },
  { title:'Read Every RC Passage Twice', text:'First skim for structure, then read for detail. Always return to the passage when answering — never trust memory alone.' },
  { title:'Filipino Vocabulary is Key', text:'Study common idioms (tayutay), proverbs (salawikain), and literary devices. These appear frequently in the Filipino subtest.' },
  { title:'Review the Night Before Lightly', text:'Don\'t cram the night before. Light review of formulas and key concepts only. Sleep for at least 8 hours — rest is study too.' },
  { title:'Use the "Star and Skip" Method', text:'Star difficult questions, skip them, finish what you can, then return. Never get stuck on one item for too long.' },
  { title:'Practice with Official-Style Questions', text:'Use mock tests and past reviewer formats. Get used to UPCAT\'s question style — vocabulary, logic chains, and scientific reasoning.' },
  { title:'Check Units in Math & Science', text:'Many wrong answers come from unit conversion errors. Always check if you\'re answering in the right unit (meters, km, mol, etc.).' },
  { title:'Stay Calm — Anxiety Costs Points', text:'Breathe. Panicking slows you down. Practice mindfulness for 5 minutes before the exam. You\'ve prepared for this. Trust the process.' },
];
function renderTips() {
  document.getElementById('tips-container').innerHTML = tips.map((t, i) => `
  <div class="tip-card fade-up">
    <div class="tip-num">${String(i+1).padStart(2,'0')}</div>
    <div class="tip-content">
      <div class="tip-title">${t.title}</div>
      <div class="tip-text">${t.text}</div>
    </div>
  </div>`).join('');
  initScrollReveal();
}

/* ----------------------------------------------------------------
   ACHIEVEMENTS
   ---------------------------------------------------------------- */
const achievements = [
  { id:'a1', icon:'🎯', name:'First Step', desc:'Complete your first reviewer', check: s => Object.values(s.reviewerDone||{}).some(Boolean) },
  { id:'a2', icon:'📚', name:'Full Stack', desc:'Complete all 4 reviewers', check: s => Object.values(s.reviewerDone||{}).filter(Boolean).length >= 4 },
  { id:'a3', icon:'🔬', name:'Science Star', desc:'Complete 15+ Science topics', check: s => ['bio','chem','phys','earth'].flatMap(id=>subjects.find(x=>x.id===id).topics).filter(t=>s.topics&&s.topics[['bio','chem','phys','earth'].find(id=>subjects.find(x=>x.id===id).topics.includes(t))+'::'+t]).length >= 15 },
  { id:'a4', icon:'📐', name:'Math Whiz', desc:'Complete 10+ Math topics', check: s => subjects.find(x=>x.id==='math').topics.filter(t=>s.topics&&s.topics['math::'+t]).length >= 10 },
  { id:'a5', icon:'🏃', name:'On a Roll', desc:'Complete 3+ mock tests', check: s => Object.values(s.mocksDone||{}).filter(Boolean).length >= 3 },
  { id:'a6', icon:'🔥', name:'Study Streak', desc:'7-day study streak', check: s => (s.streak||0) >= 7 },
  { id:'a7', icon:'✅', name:'Task Master', desc:'Complete 10+ tasks', check: s => (s.tasks||[]).filter(t=>t.done).length >= 10 },
  { id:'a8', icon:'🗓️', name:'Planner', desc:'Activate a study plan', check: s => !!s.activePlan },
  { id:'a9', icon:'💡', name:'Formula King', desc:'Bookmark 5+ formulas', check: s => Object.values(s.formulaBookmarks||{}).filter(Boolean).length >= 5 },
  { id:'a10', icon:'👑', name:'UPCAT Champion', desc:'Reach 1000+ total XP', check: s => calcXP() >= 1000 },
  { id:'a11', icon:'🌟', name:'All-Rounder', desc:'Cover topics in all 8 subjects', check: s => subjects.every(sub => sub.topics.some(t => s.topics&&s.topics[sub.id+'::'+t])) },
  { id:'a12', icon:'🚀', name:'Elite Aspirant', desc:'Complete everything: all reviewers, 3+ mocks, 50+ topics', check: s => Object.values(s.reviewerDone||{}).filter(Boolean).length>=4 && Object.values(s.mocksDone||{}).filter(Boolean).length>=3 && Object.values(s.topics||{}).filter(Boolean).length>=50 },
];
function renderAchievements() {
  document.getElementById('achievement-grid').innerHTML = achievements.map(a => {
    const unlocked = a.check(state);
    return `
    <div class="achievement-card ${unlocked?'unlocked':''}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
      ${unlocked?'<div style="font-size:0.6rem;color:var(--amber-bright);font-weight:700;margin-top:6px;letter-spacing:0.1em;">✦ UNLOCKED</div>':''}
    </div>`;
  }).join('');
}

/* ----------------------------------------------------------------
   SIMULATIONS (Mock Tests with Drive links)
   ---------------------------------------------------------------- */
const simulations = [
  {
    title:'Hard Mode Mock Test', icon:'🔥',
    desc:'Elevated difficulty engineered for quota course aspirants. Expect highly challenging Math and Science items. Best taken 2+ months before exam day.',
    color:'var(--rose)', bg:'var(--rose-dim)', diff:'Hard', badge:'HOT',
    tags:['Hard', 'Math Heavy', 'Science Heavy'],
    link:'https://drive.google.com/file/d/1CIrrjrO0Geg8R8WPD_ZkIfGAvXdT1shP/view?usp=drivesdk',
    embedId:'1CIrrjrO0Geg8R8WPD_ZkIfGAvXdT1shP',
  },
  {
    title:'Final Pre-Exam Mock', icon:'🎯',
    desc:'Take this exactly 2 weeks before the UPCAT. Calibrated to reflect true readiness. Your final benchmark before the real thing.',
    color:'var(--amber)', bg:'var(--amber-dim)', diff:'Hard', badge:'NEW',
    tags:['Hard', 'Final Review', 'All Subjects'],
    link:'https://drive.google.com/file/d/126M8-kaR9-o1DV6JTeJOqMAWF-AuPqlI/view?usp=drivesdk',
    embedId:'126M8-kaR9-o1DV6JTeJOqMAWF-AuPqlI',
  },
  {
    title:'Standard UPCAT Simulation', icon:'📋',
    desc:'Full-length timed mock test. 215 items across all UPCAT subtests. Simulates the real exam in format, timing, and difficulty level.',
    color:'var(--accent-2)', bg:'var(--accent-dim)', diff:'Medium', badge:'NEW',
    tags:['Medium', '215 Items', '3 Hours'],
    link:'https://drive.google.com/file/d/11BsahPoXNL8umnxVdejho0J1rSVCEmZy/view?usp=drivesdk',
    embedId:'11BsahPoXNL8umnxVdejho0J1rSVCEmZy',
  },
  {
    title:'Answer Key — Standard Simulation', icon:'✅',
    desc:'Official answer key for the Standard UPCAT Simulation. Use after completing the test to self-score and identify your weak areas.',
    color:'var(--emerald-bright)', bg:'var(--emerald-dim)', diff:'Easy', badge:'KEY',
    tags:['Answer Key', 'Standard Sim', 'Self-score'],
    link:'https://drive.google.com/file/d/1ux49zw-t40pQjvqjWKBDnQVIG45WpdRV/view?usp=drivesdk',
    embedId:'1ux49zw-t40pQjvqjWKBDnQVIG45WpdRV',
  },
];

function renderSimulations() {
  const grid = document.getElementById('simulation-grid');
  if (!grid) return;
  grid.innerHTML = simulations.map(s => `
  <div class="sim-card fade-up">
    <div class="sim-card-header">
      <div class="sim-card-icon" style="background:${s.bg};color:${s.color};">${s.icon}</div>
      <div style="flex:1;">
        <div class="sim-card-title">${s.title}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
          ${s.tags.map(t => `<span style="font-size:0.6rem;padding:2px 8px;border-radius:99px;background:${s.bg};color:${s.color};font-weight:700;font-family:'JetBrains Mono',monospace;border:1px solid ${s.color};opacity:0.9;">${t}</span>`).join('')}
        </div>
      </div>
      <span class="sim-new-badge">${s.badge}</span>
    </div>
    <div class="sim-card-body">
      <div class="sim-card-desc">${s.desc}</div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
        <a href="${s.link}" target="_blank" class="btn btn-primary" style="flex:1;justify-content:center;min-width:120px;">
          <i class="fas fa-download"></i> Download PDF
        </a>
        <button class="btn btn-secondary" onclick="openPdfModal('${s.embedId}','${s.title}','${s.link}')">
          <i class="fas fa-eye"></i> Preview
        </button>
      </div>
    </div>
  </div>`).join('');
  initScrollReveal();
}

/* ----------------------------------------------------------------
   MOCK TESTS (only 4 with working links)
   ---------------------------------------------------------------- */
const mocks = [
  { id:'m1', title:'Hard Mode Mock Test', icon:'🔥', diff:'Hard',
    desc:'Elevated difficulty mock designed for quota course aspirants. Challenging Math and Science.',
    link:'https://drive.google.com/file/d/1CIrrjrO0Geg8R8WPD_ZkIfGAvXdT1shP/view?usp=drivesdk' },
  { id:'m2', title:'Final Pre-Exam Mock', icon:'🎯', diff:'Hard',
    desc:'Take 2 weeks before UPCAT. Benchmark your final readiness level.',
    link:'https://drive.google.com/file/d/126M8-kaR9-o1DV6JTeJOqMAWF-AuPqlI/view?usp=drivesdk' },
  { id:'m3', title:'Standard UPCAT Simulation', icon:'📋', diff:'Medium',
    desc:'Full-length 215-item test simulating real UPCAT conditions and timing.',
    link:'https://drive.google.com/file/d/11BsahPoXNL8umnxVdejho0J1rSVCEmZy/view?usp=drivesdk' },
  { id:'m4', title:'Answer Key — Standard Simulation', icon:'✅', diff:'Easy',
    desc:'Self-score your Standard Simulation results using this official answer key.',
    link:'https://drive.google.com/file/d/1ux49zw-t40pQjvqjWKBDnQVIG45WpdRV/view?usp=drivesdk' },
];
function renderMocks() {
  if (!state.mocksDone) state.mocksDone = {};
  document.getElementById('mock-grid').innerHTML = mocks.map(m => {
    const done = state.mocksDone[m.id];
    return `
    <div class="mock-card fade-up">
      <div style="font-size:2rem;margin-bottom:10px;">${m.icon}</div>
      <div style="font-weight:800;font-size:0.95rem;margin-bottom:6px;">${m.title}</div>
      <div class="diff-badge ${m.diff==='Hard'?'diff-hard':m.diff==='Medium'?'diff-med':'diff-easy'}" style="margin-bottom:10px;display:inline-block;">${m.diff}</div>
      <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">${m.desc}</div>
      <div class="btn-row">
        <a href="${m.link}" target="_blank" class="btn btn-primary" style="flex:1;justify-content:center;text-decoration:none;">
          <i class="fas fa-external-link-alt"></i> Open
        </a>
        <button class="btn ${done?'btn-success':'btn-secondary'}" onclick="toggleMock('${m.id}')" title="Mark complete">
          <i class="fas ${done?'fa-check-circle':'fa-circle'}"></i>
        </button>
      </div>
    </div>`;
  }).join('');
  initScrollReveal();
}
function toggleMock(id) {
  if (!state.mocksDone) state.mocksDone = {};
  state.mocksDone[id] = !state.mocksDone[id];
  saveState(); renderMocks(); updateDashboardStats();
  if (state.mocksDone[id]) {
    recordStudyActivity('mock');
    advanceQuest('reviewer', 1);
    showToast('📝 Mock test complete! +30 XP');
  } else {
    showToast('Mock test unmarked.');
  }
}

/* ----------------------------------------------------------------
   DASHBOARD STATS + XP SYSTEM
   ---------------------------------------------------------------- */
const XP_VALUES = { reviewer:50, topic:10, task:15, mock:30, plan:25, formula:5 };
const RANKS = [
  [0,'Freshman Scholar'],[100,'Rising Reviewer'],[250,'Dedicated Studier'],
  [500,'Knowledge Seeker'],[800,'Academic Warrior'],[1200,'Elite Aspirant'],
  [1700,'Quota Contender'],[2300,'UPCAT Champion'],[9999,'UP Scholar']
];
function calcXP() {
  let xp = 0;
  xp += Object.values(state.reviewerDone||{}).filter(Boolean).length * XP_VALUES.reviewer;
  xp += Object.values(state.topics||{}).filter(Boolean).length * XP_VALUES.topic;
  xp += (state.tasks||[]).filter(t=>t.done).length * XP_VALUES.task;
  xp += Object.values(state.mocksDone||{}).filter(Boolean).length * XP_VALUES.mock;
  if (state.activePlan) xp += XP_VALUES.plan;
  return xp;
}
function updateDashboardStats() {
  const pdfs = Object.values(state.reviewerDone||{}).filter(Boolean).length;
  const mk   = Object.values(state.mocksDone||{}).filter(Boolean).length;
  const topicsDone  = Object.values(state.topics||{}).filter(Boolean).length;
  const totalTopics = subjects.reduce((a,s)=>a+s.topics.length,0);
  const streak = state.streak||0;

  document.getElementById('stat-pdfs').textContent   = pdfs;
  document.getElementById('stat-mocks').textContent  = mk;
  document.getElementById('stat-topics').textContent = topicsDone;
  document.getElementById('stat-streak').textContent = streak;

  const pct = Math.round((topicsDone/totalTopics)*100);
  document.getElementById('overall-pct').textContent      = pct + '%';
  document.getElementById('overall-bar').style.width      = pct + '%';

  const setBar = (id, done, total) => {
    const p = Math.round((done/total)*100);
    document.getElementById('pct-'+id).textContent    = p+'%';
    document.getElementById('bar-'+id).style.width    = p+'%';
  };
  const mathDone = subjects.find(s=>s.id==='math').topics.filter(t=>state.topics&&state.topics['math::'+t]).length;
  const bioDone  = ['bio','chem','phys','earth'].reduce((a,id)=>a+subjects.find(s=>s.id===id).topics.filter(t=>state.topics&&state.topics[id+'::'+t]).length,0);
  const filDone  = subjects.find(s=>s.id==='fil').topics.filter(t=>state.topics&&state.topics['fil::'+t]).length;
  const engDone  = ['eng','rc'].reduce((a,id)=>a+subjects.find(s=>s.id===id).topics.filter(t=>state.topics&&state.topics[id+'::'+t]).length,0);
  setBar('math',mathDone,subjects.find(s=>s.id==='math').topics.length);
  setBar('sci',bioDone,['bio','chem','phys','earth'].reduce((a,id)=>a+subjects.find(s=>s.id===id).topics.length,0));
  setBar('fil',filDone,subjects.find(s=>s.id==='fil').topics.length);
  setBar('eng',engDone,['eng','rc'].reduce((a,id)=>a+subjects.find(s=>s.id===id).topics.length,0));

  // XP
  const totalXP = calcXP();
  let lvl=1, rankName=RANKS[0][1];
  for (let i=RANKS.length-1;i>=0;i--) { if(totalXP>=RANKS[i][0]){lvl=i+1;rankName=RANKS[i][1];break;} }
  const nextRankXP = lvl<RANKS.length?RANKS[lvl][0]:RANKS[RANKS.length-1][0];
  const prevRankXP = RANKS[Math.max(0,lvl-1)][0];
  const xpPct = Math.min(100,Math.round(((totalXP-prevRankXP)/(nextRankXP-prevRankXP))*100));
  document.getElementById('xp-level').textContent = lvl;
  document.getElementById('xp-rank').textContent  = rankName;
  document.getElementById('xp-total').textContent = totalXP+' XP';
  document.getElementById('xp-sub').textContent   = `${totalXP} / ${nextRankXP} XP to next level`;
  document.getElementById('xp-fill').style.width  = xpPct+'%';

  renderAchievements();
}

/* ----------------------------------------------------------------
   GLOBAL SEARCH
   ---------------------------------------------------------------- */
function handleSearch(val) {
  const v = val.toLowerCase().trim();
  renderFormulas(v);
}

/* ----------------------------------------------------------------
   NOTIFICATION & ALERT SYSTEM
   Fire once on timer completion: browser notification + beep + toast + vibration.
   ---------------------------------------------------------------- */
function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function fireTimerAlert(title, body) {
  // 1. Browser notification (if permitted)
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏰</text></svg>' }); } catch(e) {}
  }
  // 2. Web Audio beep — two-tone chime, no external files needed
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0, 0.18], [1100, 0.2, 0.18], [880, 0.42, 0.25]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch(e) {}
  // 3. Toast
  showToast(`${title} — ${body}`);
  // 4. Vibration (Android; iOS ignores silently)
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
}

/* ----------------------------------------------------------------
   POMODORO TIMER — Enhanced with custom time input
   ---------------------------------------------------------------- */
let pomoRunning=false, pomoTime=25*60, pomoTotal=25*60, pomoInterval=null, pomoMode='work';

/* Set custom duration from the hrs/min inputs */
function setCustomPomo() {
  const hrs = parseInt(document.getElementById('pomo-hrs-input').value) || 0;
  const min = parseInt(document.getElementById('pomo-min-input').value) || 0;
  const totalSec = (hrs * 3600) + (min * 60);
  if (totalSec < 60) { showToast('⚠️ Please set at least 1 minute.'); return; }
  // Always clear before reassigning — prevents interval leak
  clearInterval(pomoInterval); pomoInterval=null; pomoRunning=false;
  pomoTime = totalSec; pomoTotal = totalSec; pomoMode='work';
  document.getElementById('pomo-start').textContent='Start';
  document.getElementById('pomo-mode-label').textContent = 'CUSTOM FOCUS SESSION';
  updatePomoDisplay();
  showToast(`⏱ Timer set to ${hrs?hrs+'h ':''}${min}m`);
}

function togglePomo() {
  if (pomoRunning) {
    // Pause: clear interval, null it out to prevent stale ref leak
    clearInterval(pomoInterval); pomoInterval=null; pomoRunning=false;
    document.getElementById('pomo-start').textContent='Resume';
  } else {
    // Guard: never start a second interval if one somehow exists
    if (pomoInterval) { clearInterval(pomoInterval); pomoInterval=null; }
    pomoRunning=true;
    // Request notification permission on first start
    requestNotifPermission();
    document.getElementById('pomo-start').textContent='Pause';
    pomoInterval=setInterval(()=>{
      pomoTime--;
      if (pomoTime<=0) {
        clearInterval(pomoInterval); pomoInterval=null; pomoRunning=false;
        if(pomoMode==='work'){
          fireTimerAlert('✅ Focus Session Complete', 'Great work! Take a 5-minute break.');
          onPomoComplete();
          pomoMode='break'; pomoTime=5*60; pomoTotal=5*60;
          document.getElementById('pomo-mode-label').textContent='BREAK TIME';
        } else {
          fireTimerAlert('🔋 Break Over', 'Time to focus again!');
          pomoMode='work'; pomoTime=25*60; pomoTotal=25*60;
          document.getElementById('pomo-mode-label').textContent='FOCUS SESSION';
        }
        document.getElementById('pomo-start').textContent='Start';
      }
      updatePomoDisplay();
    },1000);
  }
}
function resetPomo() {
  clearInterval(pomoInterval); pomoInterval=null; pomoRunning=false;
  pomoTime=25*60; pomoTotal=25*60; pomoMode='work';
  document.getElementById('pomo-start').textContent='Start';
  if(document.getElementById('pomo-mode-label'))
    document.getElementById('pomo-mode-label').textContent='FOCUS SESSION';
  updatePomoDisplay();
}
function updatePomoDisplay() {
  const h=Math.floor(pomoTime/3600);
  const m=String(Math.floor((pomoTime%3600)/60)).padStart(2,'0');
  const s=String(pomoTime%60).padStart(2,'0');
  document.getElementById('pomo-display').textContent = h ? `${h}:${m}:${s}` : `${m}:${s}`;
  const offset=408-(408*(pomoTotal-pomoTime)/pomoTotal);
  document.getElementById('pomo-circle').style.strokeDashoffset=offset;
}

/* ----------------------------------------------------------------
   CUSTOM TIMERS — Independent named countdown timers
   ---------------------------------------------------------------- */
const customTimers = []; // {id, name, total, remaining, running, interval}

function addCustomTimer() {
  const name = document.getElementById('ct-name-input').value.trim() || 'Timer';
  const hrs  = parseInt(document.getElementById('ct-hrs-input').value) || 0;
  const min  = parseInt(document.getElementById('ct-min-input').value) || 0;
  const totalSec = (hrs * 3600) + (min * 60);
  if (totalSec < 60) { showToast('⚠️ Please set at least 1 minute for the custom timer.'); return; }
  const id = Date.now();
  customTimers.push({ id, name, total: totalSec, remaining: totalSec, running: false, interval: null });
  document.getElementById('ct-name-input').value = '';
  document.getElementById('ct-hrs-input').value  = '';
  document.getElementById('ct-min-input').value  = '';
  renderCustomTimers();
  showToast(`⏲ "${name}" timer added!`);
}

function toggleCustomTimer(id) {
  const t = customTimers.find(t=>t.id===id);
  if (!t || t.remaining<=0) return;
  if (t.running) {
    clearInterval(t.interval); t.interval=null; t.running=false;
  } else {
    // Guard: clear any stale interval ref before starting
    if (t.interval) { clearInterval(t.interval); t.interval=null; }
    t.running=true;
    // Request notification permission on first timer start
    requestNotifPermission();
    t.interval=setInterval(()=>{
      t.remaining--;
      if (t.remaining<=0) {
        clearInterval(t.interval); t.interval=null; t.running=false; t.remaining=0;
        fireTimerAlert(`⏰ "${t.name}" Done!`, 'Your timer has finished.');
      }
      renderCustomTimers();
    },1000);
  }
  renderCustomTimers();
}

function resetCustomTimer(id) {
  const t = customTimers.find(t=>t.id===id);
  if (!t) return;
  clearInterval(t.interval); t.running=false; t.remaining=t.total;
  renderCustomTimers();
}

function deleteCustomTimer(id) {
  const idx = customTimers.findIndex(t=>t.id===id);
  if (idx<0) return;
  clearInterval(customTimers[idx].interval);
  customTimers.splice(idx,1);
  renderCustomTimers();
}

function fmtTime(sec) {
  const h=Math.floor(sec/3600);
  const m=String(Math.floor((sec%3600)/60)).padStart(2,'0');
  const s=String(sec%60).padStart(2,'0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function renderCustomTimers() {
  const list = document.getElementById('custom-timer-list');
  if (!list) return;
  if (customTimers.length===0) {
    list.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted);padding:10px 0;">No custom timers yet. Add one above!</div>';
    return;
  }
  list.innerHTML = customTimers.map(t=>{
    const pct = t.total > 0 ? ((t.total-t.remaining)/t.total) : 1;
    const r=36; const circ=2*Math.PI*r;
    const dash=circ; const offset=circ*pct;
    const status = t.remaining<=0 ? 'Done!' : t.running ? 'Running…' : 'Paused';
    return `
    <div class="custom-timer-card">
      <div class="custom-timer-svg-wrap">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--glass-border)" stroke-width="4"/>
          <circle cx="40" cy="40" r="${r}" fill="none"
            stroke="url(#ctGrad${t.id})" stroke-width="4"
            stroke-dasharray="${circ}" stroke-dashoffset="${dash-offset}"
            stroke-linecap="round" transform="rotate(-90 40 40)"
            style="transition:stroke-dashoffset 0.8s ease;"/>
          <defs>
            <linearGradient id="ctGrad${t.id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#6366f1"/>
              <stop offset="100%" stop-color="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="custom-timer-display">${fmtTime(t.remaining)}</div>
      </div>
      <div class="custom-timer-info">
        <div class="custom-timer-name">${t.name}</div>
        <div class="custom-timer-status">${status} · Total: ${fmtTime(t.total)}</div>
      </div>
      <div class="custom-timer-btns">
        <button class="custom-timer-btn ctb-start" onclick="toggleCustomTimer(${t.id})">
          ${t.running ? 'Pause' : t.remaining<=0 ? 'Done' : 'Start'}
        </button>
        <button class="custom-timer-btn ctb-reset" onclick="resetCustomTimer(${t.id})">Reset</button>
        <button class="custom-timer-btn ctb-delete" onclick="deleteCustomTimer(${t.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ----------------------------------------------------------------
   ACTIVITY-GATED STREAK + HEATMAP DATA
   ---------------------------------------------------------------- */
function recordStudyActivity(type) {
  const today = new Date().toDateString();
  if (!state.heatmap) state.heatmap = {};
  state.heatmap[today] = (state.heatmap[today] || 0) + 1;

  if (state.lastActiveDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    state.streak = state.lastActiveDay === yesterday ? (state.streak || 0) + 1 : 1;
    state.lastActiveDay = today;
    if (state.streak > (state.longestStreak || 0)) state.longestStreak = state.streak;
  }
  saveState();
  if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

function checkStreak() {
  const today = new Date().toDateString();
  if (state.lastActiveDay === today) return;

  const yesterday  = new Date(Date.now() - 86400000).toDateString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toDateString();

  if (state.lastActiveDay === yesterday) {
    return; // real activity will advance streak via recordStudyActivity
  } else if (state.lastActiveDay === twoDaysAgo && (state.streakFreezes || 0) > 0) {
    state.streakFreezes--;
    state.lastActiveDay = today;
    showToast('🛡️ Streak Freeze used! Your streak is protected.');
    saveState();
  } else if (state.lastActiveDay && state.lastActiveDay !== today) {
    if ((state.streak || 0) > (state.longestStreak || 0)) state.longestStreak = state.streak;
    state.streak = 0;
    saveState();
  }
}

/* ----------------------------------------------------------------
   GUIDE ACCORDION
   ---------------------------------------------------------------- */
function toggleGuideAcc(el) {
  const header = el.closest ? el : el.parentElement;
  const isOpen = header.classList.contains('open');
  // close all
  document.querySelectorAll('.guide-acc-header').forEach(h => h.classList.remove('open'));
  if (!isOpen) header.classList.add('open');
}
function toggleFaq(el) {
  const item = el.closest('.guide-faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.guide-faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ----------------------------------------------------------------
   BACK TO TOP
   ---------------------------------------------------------------- */
const bttBtn = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) bttBtn.classList.add('visible');
  else bttBtn.classList.remove('visible');
});
function scrollToTop() { window.scrollTo({ top:0, behavior:'smooth' }); }

/* ----------------------------------------------------------------
   SCROLL REVEAL ANIMATION
   ---------------------------------------------------------------- */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = (i * 0.05) + 's';
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------------
   TOTAL VISIT COUNTER — counterapi.dev
   Free, no-signup persistent hit counter. Increments once per
   browser session and displays the all-time total.
   Falls back silently if the API is unreachable.
   ---------------------------------------------------------------- */
const _COUNTER_ID = 'upcat-master-vault-2027';

async function initTotalVisitCounter() {
  const el = document.getElementById('total-visit-count');
  if (!el) return;

  // Only increment once per browser session to avoid inflation on
  // in-page navigation or hot-reloads.
  if (sessionStorage.getItem('upcat_visit_counted')) {
    try {
      const res  = await fetch(`https://api.counterapi.dev/v1/${_COUNTER_ID}/get`);
      const data = await res.json();
      if (typeof data.count === 'number') el.textContent = data.count.toLocaleString();
    } catch(e) { el.textContent = '—'; }
    return;
  }

  try {
    const res  = await fetch(`https://api.counterapi.dev/v1/${_COUNTER_ID}/up`);
    const data = await res.json();
    if (typeof data.count === 'number') {
      el.textContent = data.count.toLocaleString();
      sessionStorage.setItem('upcat_visit_counted', '1');
    }
  } catch(e) {
    el.textContent = '—';
  }
}

/* ----------------------------------------------------------------
   LIVE VISITOR COUNTER — BroadcastChannel + localStorage
   Works across tabs in the same browser. Honest about its scope:
   this tracks open tabs, not unique internet users. No backend needed.
   ---------------------------------------------------------------- */
const PRESENCE_KEY  = 'upcat_presence_v1';
const PRESENCE_TTL  = 8000;   // ms — tab considered alive if heartbeat < 8s old
const HEARTBEAT_INT = 4000;   // ms — how often each tab writes its heartbeat
const _tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
let _presenceChannel = null;
let _heartbeatTimer  = null;

function _writeHeartbeat() {
  try {
    const now = Date.now();
    const data = JSON.parse(localStorage.getItem(PRESENCE_KEY) || '{}');
    // Write this tab's timestamp
    data[_tabId] = now;
    // Evict stale tabs (no heartbeat for > TTL)
    Object.keys(data).forEach(k => { if (now - data[k] > PRESENCE_TTL) delete data[k]; });
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(data));
    _updateCounterUI(Object.keys(data).length);
  } catch(e) {}
}

function _removeHeartbeat() {
  try {
    const data = JSON.parse(localStorage.getItem(PRESENCE_KEY) || '{}');
    delete data[_tabId];
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(data));
    if (_presenceChannel) _presenceChannel.postMessage('update');
  } catch(e) {}
}

function _updateCounterUI(count) {
  const el = document.getElementById('visitor-count');
  if (el) el.textContent = count;
  const label = document.getElementById('visitor-label');
  if (label) label.textContent = count === 1 ? 'student studying now' : 'students studying now';
}

function initPresence() {
  // Immediately write heartbeat
  _writeHeartbeat();
  // Repeat heartbeat every 4s to stay "alive"
  _heartbeatTimer = setInterval(() => {
    _writeHeartbeat();
    if (_presenceChannel) _presenceChannel.postMessage('update');
  }, HEARTBEAT_INT);

  // BroadcastChannel: receive updates from other tabs instantly
  if ('BroadcastChannel' in window) {
    _presenceChannel = new BroadcastChannel('upcat_presence');
    _presenceChannel.onmessage = () => {
      try {
        const now = Date.now();
        const data = JSON.parse(localStorage.getItem(PRESENCE_KEY) || '{}');
        const live = Object.values(data).filter(ts => now - ts <= PRESENCE_TTL).length;
        _updateCounterUI(live);
      } catch(e) {}
    };
  }

  // Also listen for storage events (cross-tab on browsers that don't support BroadcastChannel)
  window.addEventListener('storage', (e) => {
    if (e.key === PRESENCE_KEY) {
      try {
        const now = Date.now();
        const data = JSON.parse(e.newValue || '{}');
        const live = Object.values(data).filter(ts => now - ts <= PRESENCE_TTL).length;
        _updateCounterUI(live);
      } catch(e2) {}
    }
  });

  // Cleanup on tab close / navigation away
  window.addEventListener('beforeunload', () => {
    clearInterval(_heartbeatTimer);
    _removeHeartbeat();
    if (_presenceChannel) { _presenceChannel.close(); _presenceChannel = null; }
  });

  // Also cleanup on visibility change (mobile app-switch, screen lock)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    } else {
      // Tab is visible again — resume heartbeat
      _writeHeartbeat();
      _heartbeatTimer = setInterval(() => {
        _writeHeartbeat();
        if (_presenceChannel) _presenceChannel.postMessage('update');
      }, HEARTBEAT_INT);
    }
  });
}


function resetData() {
  if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
    localStorage.removeItem('upcat_state_v4');
    state = {};
    initAll();
    showToast('🔄 All data has been reset.');
  }
}

/* ================================================================
   ROADMAP FEATURES — Added from Feature Roadmap v1
   ================================================================ */

/* ----------------------------------------------------------------
   DAILY QUESTS SYSTEM (Feature 1)
   ---------------------------------------------------------------- */
const QUEST_POOL = [
  { id:'q_topic_2',    text:'Complete 2 topics',           target:2,  type:'topics',    xp:30  },
  { id:'q_topic_5',    text:'Complete 5 topics',           target:5,  type:'topics',    xp:60  },
  { id:'q_formula_3',  text:'Bookmark 3 formulas',         target:3,  type:'formulas',  xp:25  },
  { id:'q_task_add',   text:'Add a study task',            target:1,  type:'task_add',  xp:20  },
  { id:'q_task_done',  text:'Complete a task',             target:1,  type:'task_done', xp:25  },
  { id:'q_pomodoro',   text:'Complete a Pomodoro session', target:1,  type:'pomodoro',  xp:40  },
  { id:'q_reviewer',   text:'Open a reviewer',             target:1,  type:'reviewer',  xp:20  },
  { id:'q_streak',     text:'Maintain your streak',        target:1,  type:'streak',    xp:50  },
  { id:'q_formula_10', text:'Study 10 formulas',           target:10, type:'formulas',  xp:45  },
  { id:'q_subj_all',   text:'Touch all 8 subjects today',  target:8,  type:'subjects',  xp:80  },
];

function getDailyQuests() {
  const today = new Date().toDateString();
  if (state.questLastReset !== today || !state.dailyQuests || !state.dailyQuests.quests) {
    const shuffled = QUEST_POOL.slice().sort(() => Math.random() - 0.5);
    state.dailyQuests = { date: today, quests: shuffled.slice(0,3).map(q => ({...q, progress:0, done:false})) };
    state.questLastReset = today;
    saveState();
  }
  return state.dailyQuests.quests;
}

function advanceQuest(type, amount = 1) {
  if (!state.dailyQuests || !state.dailyQuests.quests) return;
  let changed = false;
  state.dailyQuests.quests.forEach(q => {
    if (q.type === type && !q.done && amount > 0) {
      q.progress = Math.min(q.target, (q.progress || 0) + amount);
      if (q.progress >= q.target) {
        q.done = true;
        showToast(`🎯 Quest complete: "${q.text}"! +${q.xp} XP`);
        burstConfetti();
        changed = true;
      }
    }
  });
  if (changed) { saveState(); }
  renderDailyQuests();
}

function renderDailyQuests() {
  const el = document.getElementById('daily-quests-list');
  if (!el) return;
  const quests = getDailyQuests();
  el.innerHTML = quests.map(q => {
    const pct = Math.min(100, Math.round(((q.progress||0)/q.target)*100));
    return `
    <div class="quest-row ${q.done?'quest-done':''}">
      <div class="quest-info">
        <div class="quest-text">${q.done ? '✓ ' : ''}${q.text}</div>
        <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        <div class="quest-progress-label">${q.progress||0} / ${q.target}</div>
      </div>
      <div class="quest-xp-badge">+${q.xp} XP</div>
    </div>`;
  }).join('');
}

/* ----------------------------------------------------------------
   CONFETTI BURST (Feature 2)
   ---------------------------------------------------------------- */
function burstConfetti(x, y) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;

  const particles = Array.from({length:60}, () => ({
    x: x || canvas.width / 2, y: y || canvas.height / 3,
    vx: (Math.random() - 0.5) * 12, vy: Math.random() * -12 - 4,
    color: ['#6366f1','#22d3ee','#34d399','#fbbf24','#f43f5e','#a78bfa'][Math.floor(Math.random()*6)],
    size: Math.random() * 7 + 3, gravity: 0.35, life: 1
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life -= 0.018;
      if (p.life > 0) {
        alive = true;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.5);
      }
    });
    if (alive) requestAnimationFrame(frame);
    else document.body.removeChild(canvas);
  }
  requestAnimationFrame(frame);
}

/* ----------------------------------------------------------------
   STUDY HEATMAP (Feature 3)
   ---------------------------------------------------------------- */
function renderHeatmap(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const heatmap = state.heatmap || {};
  const today = new Date();
  const weeks = 18;
  const days = weeks * 7;
  const cells = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toDateString();
    const count = heatmap[key] || 0;
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
    cells.push({ key, count, level, label: d.toLocaleDateString('en-PH', {month:'short', day:'numeric'}) });
  }

  el.innerHTML = `
    <div class="heatmap-grid">
      ${cells.map(c => `<div class="heatmap-cell level-${c.level}" title="${c.label}: ${c.count} activities"></div>`).join('')}
    </div>
    <div class="heatmap-legend">
      <span style="color:var(--text-muted);font-size:0.7rem;">Less</span>
      ${[0,1,2,3,4].map(l => `<div class="heatmap-cell level-${l}"></div>`).join('')}
      <span style="color:var(--text-muted);font-size:0.7rem;">More</span>
    </div>`;
}

/* ----------------------------------------------------------------
   SHAREABLE PROGRESS CARD (Feature 4)
   ---------------------------------------------------------------- */
function getRankName(xp) {
  let name = RANKS[0][1];
  for (let i = RANKS.length-1; i >= 0; i--) { if(xp >= RANKS[i][0]){ name = RANKS[i][1]; break; } }
  return name;
}

async function generateProgressCard() {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 566;
  const ctx = canvas.getContext('2d');
  const xp = calcXP();
  const streak = state.streak || 0;
  const topicsDone = Object.values(state.topics||{}).filter(Boolean).length;

  const grad = ctx.createLinearGradient(0, 0, 1080, 566);
  grad.addColorStop(0, '#050711'); grad.addColorStop(1, '#0e1226');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 566);

  const glow = ctx.createRadialGradient(200, 200, 10, 200, 200, 350);
  glow.addColorStop(0, 'rgba(99,102,241,0.25)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 566);

  ctx.fillStyle = '#6366f1'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText('⚡ UPCAT 2027 Master Vault', 60, 70);
  ctx.fillStyle = '#8b95c8'; ctx.font = '18px sans-serif';
  ctx.fillText('My Study Progress — ' + new Date().toLocaleDateString('en-PH', {month:'long', year:'numeric'}), 60, 105);

  const stats = [
    { label:'Total XP',    value: xp.toLocaleString(),    color:'#a5b4fc' },
    { label:'Day Streak',  value: streak + ' 🔥',         color:'#fbbf24' },
    { label:'Topics Done', value: topicsDone + '/106',    color:'#34d399' },
    { label:'Rank',        value: getRankName(xp),        color:'#818cf8' },
  ];
  stats.forEach((s, i) => {
    const x = 60 + (i % 2) * 500, y = 200 + Math.floor(i / 2) * 130;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.roundRect(x, y, 460, 100, 12); ctx.fill();
    ctx.fillStyle = s.color; ctx.font = 'bold 44px sans-serif';
    ctx.fillText(s.value, x + 24, y + 58);
    ctx.fillStyle = '#4a527a'; ctx.font = '18px sans-serif';
    ctx.fillText(s.label, x + 24, y + 84);
  });

  ctx.fillStyle = '#4a527a'; ctx.font = '16px sans-serif';
  ctx.fillText('ianlorenzoh-web.github.io/UPCAT-2027-Master-Vault', 60, 530);

  const link = document.createElement('a');
  link.download = 'my-upcat-progress.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('📸 Progress card saved! Share it!');
}

/* ----------------------------------------------------------------
   PERSONALIZED DASHBOARD GREETING (Feature 6)
   ---------------------------------------------------------------- */
function getDashboardGreeting() {
  const hour = new Date().getHours();
  const streak = state.streak || 0;
  const xp = calcXP();
  const topicsDone = Object.values(state.topics||{}).filter(Boolean).length;
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (streak >= 30) return `${timeGreeting}, legend. 🔥 ${streak}-day streak. You're built different.`;
  if (streak >= 7)  return `${timeGreeting}! 🔥 ${streak} days strong. Don't break it now.`;
  if (streak === 0) return `${timeGreeting}. Ready to start your streak today? 💪`;
  if (xp >= 1000)   return `${timeGreeting}, ${getRankName(xp)}. Let's keep building.`;
  if (topicsDone === 0) return `${timeGreeting}! Pick a subject and complete your first topic. 🎯`;
  return `${timeGreeting}! ${topicsDone} topics done. You're making real progress. 📚`;
}

function updateGreeting() {
  const el = document.getElementById('hero-greeting');
  if (el) el.textContent = getDashboardGreeting();
}

/* ----------------------------------------------------------------
   SMART "STUDY THIS NEXT" SUGGESTION (Feature 10)
   ---------------------------------------------------------------- */
function getNextTopicSuggestion() {
  const subjectCompletion = subjects.map(s => ({
    subject: s,
    pct: s.topics.filter(t => state.topics?.[s.id+'::'+t]).length / s.topics.length
  })).sort((a, b) => a.pct - b.pct);

  for (const { subject } of subjectCompletion) {
    const nextTopic = subject.topics.find(t => !state.topics?.[subject.id+'::'+t]);
    if (nextTopic) return { subject: subject.name, topic: nextTopic, id: subject.id, color: subject.color, icon: subject.icon };
  }
  return null;
}

function renderStudyNextCard() {
  const el = document.getElementById('study-next-card');
  if (!el) return;
  const suggestion = getNextTopicSuggestion();
  if (!suggestion) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--emerald);">🎉 All topics completed! You're ready.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="study-next-inner">
      <div class="study-next-label">⚡ Study This Next</div>
      <div class="study-next-subject" style="color:${suggestion.color};">${suggestion.icon} ${suggestion.subject}</div>
      <div class="study-next-topic">${suggestion.topic}</div>
      <button class="btn btn-primary" onclick="showSection('topics')">Start →</button>
    </div>`;
}

/* ----------------------------------------------------------------
   MISTAKE NOTEBOOK (Feature 8)
   ---------------------------------------------------------------- */
function addMistake(subject, topic, note) {
  if (!state.wrongAnswers) state.wrongAnswers = [];
  state.wrongAnswers.unshift({
    id: Date.now(), subject, topic, note,
    date: new Date().toISOString().split('T')[0],
    reviewed: false
  });
  if (state.wrongAnswers.length > 200) state.wrongAnswers = state.wrongAnswers.slice(0, 200);
  saveState();
  showToast('📓 Added to mistake notebook!');
}

function toggleMistakeReviewed(id) {
  const m = (state.wrongAnswers||[]).find(x => x.id === id);
  if (m) { m.reviewed = !m.reviewed; saveState(); }
}

/* ----------------------------------------------------------------
   STUDY SESSION LOGGER (Feature 14)
   ---------------------------------------------------------------- */
function onPomoComplete() {
  const minutes = Math.round(pomoTotal / 60);
  state.totalStudyMinutes = (state.totalStudyMinutes || 0) + minutes;

  const today = new Date().toDateString();
  if (!state.heatmap) state.heatmap = {};
  state.heatmap[today] = (state.heatmap[today] || 0) + 3;

  if (!state.sessions) state.sessions = [];
  state.sessions.push({ date: new Date().toISOString(), minutes, type: 'pomodoro' });
  if (state.sessions.length > 90) state.sessions = state.sessions.slice(-90);

  recordStudyActivity('pomodoro');
  advanceQuest('pomodoro', 1);
  saveState();
  updateDashboardStats();
  renderHeatmap('study-heatmap');
}

/* ----------------------------------------------------------------
   EXPORTABLE STUDY REPORT (Feature 15)
   ---------------------------------------------------------------- */
function printStudyReport() {
  const el = document.getElementById('sec-progress-report');
  if (!el) return;
  const xp = calcXP();
  const topicsDone = Object.values(state.topics||{}).filter(Boolean).length;
  const reviewersDone = Object.values(state.reviewerDone||{}).filter(Boolean).length;
  const mocksDone = Object.values(state.mocksDone||{}).filter(Boolean).length;
  const hours = Math.floor((state.totalStudyMinutes||0) / 60);
  const mins = (state.totalStudyMinutes||0) % 60;

  el.innerHTML = `
    <div style="padding:40px;font-family:Inter,sans-serif;color:#111;">
      <h1 style="margin:0 0 4px;">⚡ UPCAT 2027 Master Vault</h1>
      <p style="color:#666;margin:0 0 32px;">Study Progress Report · Generated ${new Date().toLocaleDateString('en-PH',{dateStyle:'full'})}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
        <tr style="background:#f4f4f8;"><th style="padding:10px;text-align:left;border:1px solid #ddd;">Metric</th><th style="padding:10px;text-align:right;border:1px solid #ddd;">Value</th></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Total XP</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${xp} XP</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Current Rank</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${getRankName(xp)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Streak</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${state.streak||0} days 🔥</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Longest Streak</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${state.longestStreak||0} days</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Topics Completed</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${topicsDone} / 106</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Reviewers Completed</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${reviewersDone} / 5</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Mock Tests Done</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${mocksDone} / 4</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Total Study Time</td><td style="padding:10px;text-align:right;border:1px solid #ddd;">${hours}h ${mins}m</td></tr>
      </table>
      <p style="color:#999;font-size:12px;">Generated by UPCAT 2027 Master Vault · Free for all UPCAT aspirants · Made by Ian Lorenzo Herico</p>
    </div>`;
  window.print();
}

/* ----------------------------------------------------------------
   FORMULA BOOKMARK QUEST TRACKING
   ---------------------------------------------------------------- */
const _origBookmarkFormula = bookmarkFormula;
function bookmarkFormula(name) {
  _origBookmarkFormula(name);
  if (state.formulaBookmarks && state.formulaBookmarks[name]) {
    advanceQuest('formulas', 1);
    recordStudyActivity('formula');
  }
}

/* ====== END ROADMAP FEATURES ====== */

/* ----------------------------------------------------------------
   INIT ALL
   ---------------------------------------------------------------- */
function initAll() {
  checkStreak();
  setRandomQuote();
  updateCountdown();
  renderReviewers();
  renderFolderReviewers();
  renderTopics();
  renderPlans();
  renderFormulas();
  renderTasks();
  renderTips();
  renderAchievements();
  renderMocks();
  renderSimulations();
  updateDashboardStats();
  updatePomoDisplay();
  renderCustomTimers();
  initPresence();
  initTotalVisitCounter();
  setTimeout(initScrollReveal, 300);
}
