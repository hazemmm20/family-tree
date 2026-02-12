async function fetchTree() {
  const r = await fetch("/api/tree");
  return r.json();
}
async function fetchPerson(id) {
  const r = await fetch(`/api/person/${id}`);
  return r.json();
}

/* ===== Theme (Light/Dark) ===== */
(function themeInit(){
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  if (btn) btn.textContent = saved === "light" ? "الوضع: فاتح" : "الوضع: داكن";

  btn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    btn.textContent = next === "light" ? "الوضع: فاتح" : "الوضع: داكن";
  });
})();

/* ===== Modal ===== */
function openModal(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  body.innerHTML = html;
  modal.classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}
document.getElementById("closeModal")?.addEventListener("click", closeModal);
document.getElementById("modal")?.addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

/* ===== Drawer (Overlay) ===== */
const drawer = document.getElementById("drawer");

function openDrawer(){
  drawer?.classList.add("isOpen");
}
function closeDrawer(){
  drawer?.classList.remove("isOpen");
}

document.getElementById("toggleDetails")?.addEventListener("click", () => {
  drawer?.classList.toggle("isOpen");
});
document.getElementById("closeDrawer")?.addEventListener("click", closeDrawer);

/* ===== Details ===== */
function showDetailsInSide(person) {
  const details = document.getElementById("details");
  const childrenCount = person.children ? person.children.length : 0;

  const spousesText = (person.spouses && person.spouses.length)
    ? person.spouses
        .map(s => `${s.ord ? s.ord + ") " : ""}${s.spouse_name}`)
        .join("<br>")
    : "-";

  details.innerHTML = `
    <div class="kvs">
      <div><b>الاسم:</b> ${person.name}</div>
      <div><b>تاريخ الميلاد:</b> ${person.birth_date || "-"}</div>
      <div><b>العمل:</b> ${person.job || "-"}</div>
      <div><b>الزوج/الزوجة:</b><div style="margin-top:6px; line-height:1.8">${spousesText}</div></div>
      <div><b>عدد الأبناء:</b> ${childrenCount}</div>
      ${person.notes ? `<div><b>ملاحظات:</b> ${person.notes}</div>` : ""}
    </div>
  `;
}

/* ===== Frame (SVG) ===== */
function starPath(cx, cy, outerR, innerR, points) {
  let path = "";
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    path += (i === 0 ? "M" : "L") + x + " " + y + " ";
  }
  return path + "Z";
}

function addFrame(g, w, h) {
  g.append("rect")
    .attr("x", -w/2).attr("y", -h/2)
    .attr("width", w).attr("height", h)
    .attr("rx", 18).attr("ry", 18)
    .attr("fill", "var(--cardFill)")
    .attr("stroke", "#c7a24b")
    .attr("stroke-width", 2.6);

  g.append("rect")
    .attr("x", -w/2 + 9).attr("y", -h/2 + 9)
    .attr("width", w - 18).attr("height", h - 18)
    .attr("rx", 16).attr("ry", 16)
    .attr("fill", "var(--cardInner)")
    .attr("stroke", "#e5e7eb")
    .attr("stroke-width", 1.2);

  const corners = [
    {x: -w/2 + 20, y: -h/2 + 20},
    {x:  w/2 - 20, y: -h/2 + 20},
    {x: -w/2 + 20, y:  h/2 - 20},
    {x:  w/2 - 20, y:  h/2 - 20},
  ];
  corners.forEach(c => {
    g.append("circle")
      .attr("cx", c.x).attr("cy", c.y).attr("r", 8)
      .attr("fill", "none")
      .attr("stroke", "#c7a24b")
      .attr("stroke-width", 1.8);

    g.append("path")
      .attr("d", starPath(c.x, c.y, 7, 3.4, 8))
      .attr("fill", "#c7a24b")
      .attr("opacity", 0.55);
  });

  g.append("path")
    .attr("d", `M ${-w/2 + 26} ${22} Q 0 ${10} ${w/2 - 26} ${22}`)
    .attr("stroke", "#e3c46a")
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("opacity", 0.7);
}

/* ===== Focus Mode ===== */
function getAncestors(node) {
  const arr = [];
  let p = node.parent;
  while (p) { arr.push(p); p = p.parent; }
  return arr;
}
function getChildren(node) {
  return node.children || [];
}
function focusOnNode(clickedNode, allNodesSel, allLinksSel) {
  const visible = new Set([clickedNode, ...getAncestors(clickedNode), ...getChildren(clickedNode)]);

  allNodesSel
    .attr("opacity", d => visible.has(d) ? 1 : 0.07)
    .attr("pointer-events", d => visible.has(d) ? "auto" : "none");

  allLinksSel
    .attr("opacity", d => (visible.has(d.source) && visible.has(d.target)) ? 1 : 0.04);

  return visible;
}
function resetFocus(allNodesSel, allLinksSel) {
  allNodesSel.attr("opacity", 1).attr("pointer-events", "auto");
  allLinksSel.attr("opacity", 1);
  allNodesSel.classed("nodeSelected", false);
}

/* ===== Pan/Zoom + Fit ===== */
let svg, mainG, zoomBehavior;

/* ✅ نخزن state عشان نحدث الثيم بدون Refresh */
const __treeState = {
  rootData: null,
  nodesSel: null,
  linksSel: null,
  containerEl: null
};

function fitToScreen(containerEl, padding = 90) {
  const bounds = mainG.node().getBBox();
  const w = containerEl.clientWidth || 1;
  const h = containerEl.clientHeight || 1;

  const fullW = bounds.width + padding * 2;
  const fullH = bounds.height + padding * 2;

  const scale = Math.min(w / fullW, h / fullH);
  const tx = (w - bounds.width * scale) / 2 - bounds.x * scale;
  const ty = (h - bounds.height * scale) / 2 - bounds.y * scale;

  const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
  svg.transition().duration(320).call(zoomBehavior.transform, t);
}

/* ===== Helpers: Theme + Node HTML ===== */
function getCurrentTheme() {
  // يدعم html.dark + data-theme
  const isDark = document.documentElement.classList.contains("dark")
    || (document.documentElement.getAttribute("data-theme") === "dark");
  return isDark ? "dark" : "light";
}

function buildNodeHtml({ photo, name, sub }, theme, nodeW, nodeH) {
  // ✅ LIGHT: نفس شكل/ألوان الوضع الفاتح السابق (يعتمد على CSS في index.html)
  if (theme === "light") {
    return `
      <div class="flex flex-col items-center" style="width:${nodeW}px;height:${nodeH}px;">
        <div class="node-portrait">
          <img class="w-full h-full object-cover"
               src="${photo.replace(/"/g, "%22")}"
               alt="${name.replace(/"/g, "%22")}"
               onerror="this.src='/images/default.png'"/>
        </div>
        <div class="name-box">
          <div class="node-label-text font-bold text-lg leading-tight">${name}</div>
          ${sub ? `<div class="node-label-text text-[10px] opacity-60">${sub}</div>` : ``}
        </div>
      </div>
    `;
  }

  // ✅ DARK: نفس شكل/ألوان الوضع الداكن الحالي (ممتاز)
  const boxBg   = "#16191E";
  const boxBd   = "rgba(212,175,55,.55)";
  const nameCol = "#FDFBF7";
  const subCol  = "rgba(253,251,247,.70)";
  const photoBg = "#0F1115";
  const photoBd = "#D4AF37";

  return `
    <div class="flex flex-col items-center" style="width:${nodeW}px;height:${nodeH}px;">
      <div class="node-portrait" style="background:${photoBg}; border-color:${photoBd};">
        <img
          style="width:100%;height:100%;object-fit:contain;display:block;padding:6px;background:${photoBg};"
          src="${photo.replace(/"/g, "%22")}"
          alt="${name.replace(/"/g, "%22")}"
          onerror="this.src='/images/default.png'"
        />
      </div>
      <div class="name-box" style="background:${boxBg}; border-color:${boxBd};">
        <div class="node-label-text font-bold text-lg leading-tight" style="color:${nameCol};">${name}</div>
        ${sub ? `<div class="node-label-text text-[10px]" style="color:${subCol};">${sub}</div>` : ``}
      </div>
    </div>
  `;
}

/* ✅ تحديث nodes عند تغيير الثيم بدون Refresh */
function updateNodesTheme() {
  if (!__treeState.nodesSel) return;

  const theme = getCurrentTheme();
  const nodeW = 170;
  const nodeH = 190;

  __treeState.nodesSel.each(function(d) {
    const g = d3.select(this);
    const fo = g.select("foreignObject");
    if (fo.empty()) return;

    const photo = (d.data.photo_url && String(d.data.photo_url).trim())
      ? String(d.data.photo_url).trim()
      : "/images/default.png";

    const name = (d.data.name || "").toString();
    const sub  = d.data.birth_date ? String(d.data.birth_date) : "";

    // نخلي التحديث على نفس عنصر الـ div داخل foreignObject
    const div = fo.select("div");
    if (!div.empty()) {
      div.html(buildNodeHtml({ photo, name, sub }, theme, nodeW, nodeH));
    } else {
      // fallback (نادر)
      fo.append("xhtml:div").html(buildNodeHtml({ photo, name, sub }, theme, nodeW, nodeH));
    }
  });
}

/* ✅ مراقبة تغيير الثيم */
(function watchThemeChanges(){
  const root = document.documentElement;
  let last = getCurrentTheme();

  const obs = new MutationObserver(() => {
    const now = getCurrentTheme();
    if (now === last) return;
    last = now;
    updateNodesTheme();
  });

  obs.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
})();

/* ===== Render ===== */
function renderTree(rootData) {
  const container = document.getElementById("tree");
  container.innerHTML = "";

  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  svg = d3.select(container).append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  mainG = svg.append("g").attr("class", "mainG");

  zoomBehavior = d3.zoom()
    .scaleExtent([0.35, 2.2])
    .on("zoom", (event) => mainG.attr("transform", event.transform));

  svg.call(zoomBehavior);

  const root = d3.hierarchy(rootData);

  const treeLayout = d3.tree()
    .nodeSize([220, 240])
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.45));

  treeLayout(root);

  function curvedLink(d) {
    const sx = d.source.x;
    const sy = d.source.y + 80;
    const tx = d.target.x;
    const ty = d.target.y - 10;
    const midY = (sy + ty) / 2;
    return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
  }

  const links = mainG.append("g")
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr("class", "link")
    .attr("d", curvedLink)
    .attr("fill", "none")
    .attr("stroke", "#8B5E3C")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.85);

  const nodeW = 170;
  const nodeH = 190;

  const nodes = mainG.append("g")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("class", "nodeCard")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  nodes.each(function(d) {
    const g = d3.select(this);

    const photo = (d.data.photo_url && String(d.data.photo_url).trim())
      ? String(d.data.photo_url).trim()
      : "/images/default.png";

    const name = (d.data.name || "").toString();
    const sub = d.data.birth_date ? String(d.data.birth_date) : "";

    const clipId = `clip-${(d.data.id ?? (Math.random()+"").slice(2)).toString().replace(/[^\w-]/g, "")}`;

    const fo = g.append("foreignObject")
      .attr("x", -nodeW / 2)
      .attr("y", -70)
      .attr("width", nodeW)
      .attr("height", nodeH)
      .style("overflow", "visible");

    // ✅ مبدئياً اكتب حسب الثيم الحالي
    const theme = getCurrentTheme();
    fo.append("xhtml:div").html(buildNodeHtml({ photo, name, sub }, theme, nodeW, nodeH));

    g.append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", -39).attr("y", -39)
      .attr("width", 78).attr("height", 78)
      .attr("rx", 14).attr("ry", 14);
  });

  nodes.on("click", async (event, d) => {
    event.stopPropagation();

    const p = await fetchPerson(d.data.id);
    showDetailsInSide(p);

    openDrawer();

    resetFocus(nodes, links);
    nodes.classed("nodeSelected", n => n === d);
    focusOnNode(d, nodes, links);

    const spousesHtml = (p.spouses && p.spouses.length)
      ? p.spouses.map(s => `<div>${s.ord}) ${s.spouse_name}</div>`).join("")
      : "-";

    openModal(`
      <h3 style="margin:0 0 10px 0">${p.name}</h3>
      <p><b>تاريخ الميلاد:</b> ${p.birth_date || "-"}</p>
      <p><b>العمل:</b> ${p.job || "-"}</p>
      <p><b>الزوج/الزوجة:</b><div style="margin-top:6px;line-height:1.8">${spousesHtml}</div></p>
      <p><b>الأبناء:</b> ${(p.children || []).map(c => c.name).join("، ") || "-"}</p>
      ${p.notes ? `<p><b>ملاحظات:</b> ${p.notes}</p>` : ""}
    `);
  });

  svg.on("click", () => resetFocus(nodes, links));

  document.getElementById("resetView").onclick = () => {
    resetFocus(nodes, links);
    fitToScreen(container, 110);
  };
  document.getElementById("zoomIn").onclick = () => svg.transition().duration(150).call(zoomBehavior.scaleBy, 1.18);
  document.getElementById("zoomOut").onclick = () => svg.transition().duration(150).call(zoomBehavior.scaleBy, 0.85);
  document.getElementById("fit").onclick = () => fitToScreen(container, 110);

  document.getElementById("focusMode").onclick = () => {
    openModal(`<h3 style="margin:0 0 10px 0">وضع التركيز</h3>
      <p>اضغط على شخص: يظهر الشخص + الآباء + الأبناء المباشرين، ويخفي الإخوة وباقي الفروع.</p>
      <p>اضغط خارج الأشخاص أو على "عرض الشجرة كاملة" للعودة.</p>
    `);
  };

  const searchInput = document.getElementById("search");
  searchInput.oninput = () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      resetFocus(nodes, links);
      return;
    }
    nodes
      .attr("opacity", d => String(d.data.name).toLowerCase().includes(q) ? 1 : 0.12)
      .attr("pointer-events", d => String(d.data.name).toLowerCase().includes(q) ? "auto" : "none");
    links.attr("opacity", 0.08);
  };

  setTimeout(() => fitToScreen(container, 120), 0);

  window.addEventListener("resize", () => {
    clearTimeout(window.__fitTimer);
    window.__fitTimer = setTimeout(() => fitToScreen(container, 120), 120);
  });

  // ✅ خزّن state للتحديثات الفورية
  __treeState.rootData = rootData;
  __treeState.nodesSel = nodes;
  __treeState.linksSel = links;
  __treeState.containerEl = container;

  // ✅ تأكيد تحديث الثيم مباشرة بعد أول render
  updateNodesTheme();
}

/* ===== Init ===== */
(async function init() {
  try {
    const root = await fetchTree();
    if (!root) {
      document.getElementById("tree").innerHTML =
        "<div style='padding:14px;color:var(--muted)'>لا توجد بيانات بعد.</div>";
      return;
    }
    renderTree(root);
  } catch (e) {
    console.error("Tree render error:", e);
    document.getElementById("tree").innerHTML =
      "<div style='padding:14px;color:var(--muted)'>حدث خطأ أثناء تحميل الشجرة. افتح Console لمعرفة السبب.</div>";
  }
})();
