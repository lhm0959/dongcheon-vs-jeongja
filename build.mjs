// 볼트의 synthesis 페이지를 공개용 HTML 한 장으로 빌드한다.
// 사용: node build.mjs  → index.html
// 원본은 private 볼트에 있다. 위키링크는 공개 페이지에서 갈 곳이 없으므로 텍스트로 바꾼다.
import fs from 'fs';
import { marked } from 'marked';

const SRC = '/Users/hanmin/obsidian/wiki/synthesis/동천84-벽산59-정자전세-매물-비교.md';
let md = fs.readFileSync(SRC, 'utf8');

// frontmatter
const fm = {};
md = md.replace(/^---\n([\s\S]*?)\n---\n/, (_, y) => {
  for (const line of y.split('\n')) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) fm[m[1]] = m[2]; }
  return '';
});

// 제목·리드 분리 (히어로에 쓴다)
const h1 = md.match(/^# (.+)$/m)[1];
md = md.replace(/^# .+\n/m, '');
const leadMatch = md.match(/^기준일 2026-10-22\.[^\n]+$/m);
const lead = leadMatch ? leadMatch[0] : '';
if (leadMatch) md = md.replace(leadMatch[0], '');

// 위키링크 → 텍스트. positions는 비공개 기록이라 표시만.
md = md.replace(/\[\[positions\/[^\]]+\]\]/g, '<span class="priv">본인 자금 기록 (비공개)</span>');
md = md.replace(/\[\[([^\]]+)\]\]/g, (_, n) => `<strong class="wl">${n.replace(/-/g, ' ')}</strong>`);

// 모순 주석 → 보이는 인라인 경고 (표 셀 안에도 있어서 블록이 아니라 인라인)
md = md.replace(/<!--\s*모순: lint 필요\s*—?\s*([\s\S]*?)\s*-->/g,
  (_, t) => ` <span class="warn"><b>모순 · 확인 필요</b> ${t.replace(/\s+/g, ' ')}</span>`);

// '~'는 이 글에서 범위(2017~2022, 4,100~4,250만)다. GFM 취소선으로 읽히지 않게 끈다.
md = md.replace(/~~(.+?)~~/g, '<del>$1</del>');
const tokenizer = { del() { return undefined; } };

// 헤딩에 id, 링크는 새 탭. 네이버 매물 링크는 칩으로.
const toc = [];
const renderer = {
  heading(text, level) {
    if (level === 2) {
      const id = `s${toc.length + 1}`;
      const m = text.match(/^(\d+)\.\s*(.+?)(\s+—\s+(.+))?$/);
      toc.push({ id, num: m ? m[1] : '', short: m ? m[2] : text });
      return `<h2 id="${id}"><span class="num">${m ? m[1] : ''}</span>${m ? m[2] : text}${m && m[4] ? `<small>${m[4]}</small>` : ''}</h2>\n`;
    }
    return `<h${level}>${text}</h${level}>\n`;
  },
  link(href, title, text) {
    const ext = /^https?:/.test(href);
    const naver = /fin\.land\.naver\.com\/articles\//.test(href);
    const cls = naver ? ' class="lst"' : '';
    return `<a href="${href}"${cls}${ext ? ' target="_blank" rel="noopener"' : ''}>${naver ? '매물 ' : ''}${text}</a>`;
  },
  table(header, body) {
    return `<div class="tw"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
  },
};
marked.use({ renderer, tokenizer, gfm: true, breaks: false });
const body = marked.parse(md);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// marked가 넘긴 heading text는 이미 이스케이프돼 있다 — 다시 하지 않는다.
const tocHtml = toc.map((t) => `<a href="#${t.id}"><b>${t.num}</b>${t.short}</a>`).join('');

// 히어로의 순위 띠 — §1 표의 요약. 본문과 어긋나지 않게 손으로 맞춘다.
const ranks = [
  { n: 1, k: 'pick', v: '추천', name: '대림아크로텔 63㎡ 투룸 전세', price: '4억 6,000', why: '전세가율 71~77% · HUG 80%도 통과', href: 'https://fin.land.naver.com/articles/2653791448' },
  { n: 2, k: 'buy', v: '매수 전환 시 1순위', name: '동천현대홈타운2차 84㎡', price: '12억', why: '205동 동향보다 204동 7층 남향(올확장) 먼저 · 11억 8,000 이하가 조건', href: 'https://fin.land.naver.com/articles/2656553304' },
  { n: 3, k: 'buy', v: '12억이면 2위와 교체', name: '동천디이스트 510동 84㎡', price: '12억 3,000', why: '저층 · 감면선 밖 · 저층 6건 중 수리 범위 최대', href: 'https://fin.land.naver.com/articles/2655504319' },
  { n: 4, k: 'hold', v: '보류', name: '벽산타운2단지 59㎡ 세안고', price: '10억 3,000', why: '비확장 · 입주 2028-02 · 취득세 감면 불가', href: 'https://fin.land.naver.com/articles/2653765059' },
  { n: 5, k: 'out', v: '탈락', name: '정자푸르지오시티3차 42㎡ 전세', price: '4억 3,000', why: '방 1개 · 전세가율 86~110%', href: 'https://fin.land.naver.com/articles/2655171176' },
];
const rankHtml = ranks.map((r) => `
    <a class="rk ${r.k}" href="${r.href}" target="_blank" rel="noopener">
      <span class="no">${r.n}</span><span class="v">${r.v}</span>
      <b>${r.name}</b><em>${r.price}</em><p>${r.why}</p>
    </a>`).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(h1)}</title>
<meta name="description" content="동천 84㎡ 매수 2건·벽산 59㎡ 세안고·정자 오피스텔 전세 2건을 한 틀로 줄 세운 판단. 기준일 ${fm.updated}.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
:root{
  --ground:#F2F4F6; --paper:#FFFFFF; --ink:#1B2430; --ink-2:#4A5563; --mute:#6B7684;
  --rule:#D8DEE6; --rule-soft:#E7ECF1;
  --a:#2F4B7C; --a-soft:#E4EAF4; --b:#3F7A5E; --b-soft:#E1EFE7;
  --h:#9A6B10; --h-soft:#F6EDD8;
  --seal:#B4271F; --seal-soft:#F6E4E2;
  --maxw:860px; color-scheme:light;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#0F1419; --paper:#161C23; --ink:#E6EBF0; --ink-2:#B7C0CA; --mute:#8D98A5;
    --rule:#28323D; --rule-soft:#1F2832;
    --a:#8FB0E6; --a-soft:#1E2A3D; --b:#86C2A2; --b-soft:#1B2E25;
    --h:#D9B46A; --h-soft:#332A17;
    --seal:#E0675D; --seal-soft:#3A1F1D; color-scheme:dark;
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ground);color:var(--ink);font:400 15.5px/1.7 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
a{color:var(--a);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--a) 40%,transparent);text-underline-offset:3px}
a:hover{text-decoration-color:var(--a)}
:focus-visible{outline:2px solid var(--seal);outline-offset:2px}

/* 히어로 — 계약서 표지처럼. 판정 도장이 유일한 장식이다. */
.hero{background:var(--paper);border-bottom:1px solid var(--rule)}
.hero .in{max-width:var(--maxw);margin:0 auto;padding:40px 20px 28px;position:relative}
.eyebrow{font-size:12.5px;letter-spacing:.08em;color:var(--mute);text-transform:uppercase;margin:0 0 14px}
.eyebrow b{color:var(--ink-2);font-weight:500;letter-spacing:0}
h1{font:700 clamp(24px,4.2vw,36px)/1.3 "Hahmlet","Noto Serif KR",serif;margin:0 0 18px;letter-spacing:-.01em;max-width:22em}
.lead{color:var(--ink-2);font-size:14.5px;margin:0 0 22px;max-width:48em}
.seal{position:absolute;right:20px;top:28px;transform:rotate(-7deg);border:3px double var(--seal);color:var(--seal);border-radius:8px;
  padding:8px 14px 6px;font:700 15px/1.2 "Hahmlet",serif;text-align:center;letter-spacing:.06em;opacity:.92;background:color-mix(in srgb,var(--seal-soft) 55%,transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--seal) 35%,transparent)}
.seal small{display:block;font:500 11px/1.3 "Noto Sans KR",sans-serif;letter-spacing:.02em;margin-top:4px;opacity:.85}
@media (max-width:640px){ .seal{position:static;display:inline-block;transform:rotate(-4deg);margin:0 0 20px 4px} .hero .in{padding-top:28px} }
@media (prefers-reduced-motion:no-preference){ .seal{animation:stamp .45s cubic-bezier(.2,.9,.3,1.2) both .15s} @keyframes stamp{from{opacity:0;transform:rotate(-7deg) scale(1.25)}to{opacity:.92;transform:rotate(-7deg) scale(1)}} }

/* 순위 띠 — 다섯 장을 한 줄에. 1번만 색을 준다. */
.ranks{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:0}
.rk{display:block;border:1px solid var(--rule);border-radius:10px;padding:12px 13px 10px;background:var(--ground);text-decoration:none;color:var(--ink);position:relative;min-height:100%}
.rk:hover{border-color:var(--a)}
.rk .no{position:absolute;right:10px;top:8px;font:700 22px/1 "Hahmlet",serif;color:var(--rule);letter-spacing:-.02em}
.rk .v{display:inline-block;font:700 11.5px/1 "Noto Sans KR",sans-serif;padding:5px 7px 4px;border-radius:6px;margin-bottom:9px;background:var(--rule-soft);color:var(--ink-2)}
.rk.pick{background:var(--b-soft);border-color:color-mix(in srgb,var(--b) 50%,var(--rule))} .rk.pick .v{background:var(--b);color:#fff} .rk.pick .no{color:color-mix(in srgb,var(--b) 45%,transparent)}
.rk.buy .v{background:var(--a-soft);color:var(--a)}
.rk.hold .v{background:var(--h-soft);color:var(--h)}
.rk.out .v{background:var(--seal-soft);color:var(--seal)}
.rk b{display:block;font:700 14px/1.35 "Noto Sans KR",sans-serif;margin:0 0 2px;padding-right:22px}
.rk em{display:block;font:700 16px/1.2 "Hahmlet",serif;font-style:normal;margin:0 0 6px;font-variant-numeric:tabular-nums}
.rk p{margin:0;color:var(--ink-2);font-size:12.5px;line-height:1.5}
@media (max-width:860px){ .ranks{grid-template-columns:repeat(3,1fr)} }
@media (max-width:560px){ .ranks{grid-template-columns:1fr 1fr} .rk.pick{grid-column:1 / -1} }

/* 목차 */
.toc{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
.toc .in{max-width:var(--maxw);margin:0 auto;padding:0 12px;display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.toc .in::-webkit-scrollbar{display:none}
.toc a{flex:0 0 auto;font-size:12.5px;color:var(--ink-2);text-decoration:none;padding:10px 9px;border-bottom:2px solid transparent;white-space:nowrap}
.toc a b{color:var(--mute);font-weight:500;margin-right:5px;font-variant-numeric:tabular-nums}
.toc a:hover{color:var(--ink);border-bottom-color:var(--rule)}

/* 본문 */
main{max-width:var(--maxw);margin:0 auto;padding:8px 20px 64px}
main h2{font:700 clamp(20px,3vw,25px)/1.35 "Hahmlet","Noto Serif KR",serif;margin:48px 0 14px;padding-top:8px;letter-spacing:-.005em;scroll-margin-top:56px}
main h2 .num{display:inline-block;min-width:1.6em;color:var(--mute);font-weight:500;font-variant-numeric:tabular-nums}
main h2 small{display:block;font:500 14px/1.5 "Noto Sans KR",sans-serif;color:var(--ink-2);margin-top:6px;letter-spacing:0}
main h3{font:700 16px/1.4 "Noto Sans KR",sans-serif;margin:28px 0 10px;color:var(--ink)}
main p{margin:0 0 14px}
main hr{border:0;border-top:1px solid var(--rule);margin:40px 0 0}
main ul,main ol{padding-left:1.3em;margin:0 0 14px} main li{margin:4px 0}
main strong{font-weight:700}
.wl{font-weight:600;color:var(--ink-2);text-decoration:underline dotted;text-underline-offset:3px}
.priv{display:inline-block;font-size:12px;padding:1px 7px;border:1px dashed var(--rule);border-radius:999px;color:var(--mute);vertical-align:1px}
.warn{display:inline-block;font-size:12.5px;line-height:1.5;background:var(--seal-soft);color:color-mix(in srgb,var(--seal) 85%,var(--ink));border-left:3px solid var(--seal);padding:3px 8px;border-radius:0 6px 6px 0;margin:4px 0}
.warn b{font-weight:700;margin-right:4px}
a.lst{display:inline-block;font-size:12px;line-height:1.3;padding:2px 7px;border:1px solid color-mix(in srgb,var(--a) 35%,var(--rule));border-radius:999px;background:var(--paper);text-decoration:none;white-space:nowrap;margin:1px 0;font-variant-numeric:tabular-nums}
a.lst:hover{background:var(--a-soft)}
blockquote{margin:0 0 14px;padding:10px 14px;border-left:3px solid var(--rule);color:var(--ink-2);background:var(--paper);border-radius:0 8px 8px 0}
del{color:var(--mute)}
code{font:500 .92em/1 ui-monospace,"SF Mono",Menlo,monospace;background:var(--rule-soft);padding:2px 5px;border-radius:4px}

/* 표 — 보고서의 본체. 좁은 화면에서는 가로 스크롤. */
.tw{overflow-x:auto;margin:0 -20px 18px;padding:0 20px;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;min-width:560px;font-size:13.5px;line-height:1.55;background:var(--paper);border:1px solid var(--rule);border-radius:10px;overflow:hidden;font-variant-numeric:tabular-nums}
thead th{text-align:left;font-weight:700;font-size:12.5px;color:var(--ink-2);background:var(--rule-soft);padding:9px 12px;border-bottom:1px solid var(--rule);white-space:nowrap}
tbody td{padding:9px 12px;border-top:1px solid var(--rule-soft);vertical-align:top}
tbody tr:first-child td{border-top:0}
tbody td:first-child{font-weight:500}
tbody tr:hover td{background:color-mix(in srgb,var(--a) 4%,transparent)}
td code{white-space:nowrap}

footer{border-top:1px solid var(--rule);color:var(--mute);font-size:12.5px}
footer .in{max-width:var(--maxw);margin:0 auto;padding:22px 20px 40px}
footer p{margin:0 0 6px}
</style>
</head>
<body>
<header class="hero"><div class="in">
  <p class="eyebrow">부동산 판단 · 기준일 <b>${fm.updated}</b> · 신뢰도 <b>${fm.confidence}</b> · 앞선 보고서 <a href="https://lhm0959.github.io/byeoksan-vs-jeongja/">벽산 매수 vs 정자 전세</a></p>
  <div class="seal">전세 1순위<small>대림아크로텔 · 매수 전환 시 동천 84㎡</small></div>
  <h1>${esc(h1)}</h1>
  <p class="lead">${lead.replace(/\[\[positions\/[^\]]+\]\]/g, '본인 자금 기록(비공개)').replace(/\[\[([^\]]+)\]\]/g, (_, n) => n.replace(/-/g, ' ')).replace(/\*\*/g, '')}</p>
  <div class="ranks">${rankHtml}
  </div>
</div></header>
<nav class="toc" aria-label="목차"><div class="in">${tocHtml}</div></nav>
<main>
${body}
</main>
<footer><div class="in">
  <p>출처와 등급([high]·[medium]·[low])은 본문 각 표에 표기. 매물 링크는 네이버부동산이며 매물이 내려가면 만료된다.</p>
  <p>개인 재무 정보는 포함하지 않았다. 이 페이지는 검색엔진 색인을 막아 두었다(noindex). 원본은 비공개 볼트 <code>wiki/synthesis/</code>.</p>
</div></footer>
</body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('index.html', html.length, 'bytes,', toc.length, 'sections');
