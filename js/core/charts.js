window.FC = window.FC || {};

FC.charts = (function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  let uid = 0;

  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const k in attrs) node.setAttribute(k, attrs[k]);
    }
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function root(width, height) {
    return el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "none",
      role: "img"
    });
  }

  function baseline(svg, x1, y, x2) {
    svg.appendChild(
      el("line", { x1: x1, y1: y, x2: x2, y2: y, stroke: "rgba(148, 163, 184, 0.25)", "stroke-width": 1 })
    );
  }

  function line(values, opts) {
    opts = opts || {};
    const W = opts.width || 560;
    const H = opts.height || 160;
    const color = opts.color || "#8b5cf6";
    const labels = opts.labels || [];
    const numeric = values.filter((v) => v !== null && v !== undefined);
    const max = opts.max != null ? Math.max(1, opts.max) : Math.max(1, ...numeric);
    const padL = 4;
    const padR = 4;
    const padT = 8;
    const padB = 4;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const baseY = padT + innerH;
    const n = values.length;

    const pts = values.map((v, i) => {
      const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = v === null || v === undefined ? null : padT + innerH - (Math.min(v, max) / max) * innerH;
      return { x: Math.round(x * 10) / 10, y: y === null ? null : Math.round(y * 10) / 10, v: v };
    });

    const svg = root(W, H);
    const gid = "fc-grad-" + (++uid);
    const defs = el("defs");
    const grad = el("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.32" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    baseline(svg, padL, baseY, W - padR);

    let i = 0;
    while (i < n) {
      if (pts[i].y === null) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < n && pts[j + 1].y !== null) j++;
      if (j > i) {
        const d = pts
          .slice(i, j + 1)
          .map((p, k) => `${k === 0 ? "M" : "L"}${p.x},${p.y}`)
          .join(" ");
        const area = `${d} L${pts[j].x},${baseY} L${pts[i].x},${baseY} Z`;
        svg.appendChild(el("path", { d: area, fill: `url(#${gid})` }));
        svg.appendChild(
          el("path", {
            d: d,
            fill: "none",
            stroke: color,
            "stroke-width": 2.5,
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
          })
        );
      }
      i = j + 1;
    }

    pts.forEach((p, idx) => {
      if (p.y === null) return;
      const circle = el("circle", { cx: p.x, cy: p.y, r: n === 1 ? 4 : 2.8, fill: color });
      if (labels[idx] !== undefined && labels[idx] !== null) {
        circle.appendChild(el("title", null, labels[idx]));
      }
      svg.appendChild(circle);
    });

    return svg;
  }

  function bars(values, opts) {
    opts = opts || {};
    const W = opts.width || 560;
    const H = opts.height || 160;
    const color = opts.color || "#22d3ee";
    const labels = opts.labels || [];
    const max = opts.max != null ? Math.max(1, opts.max) : Math.max(1, ...values);
    const padL = 4;
    const padR = 4;
    const padT = 8;
    const padB = 4;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const baseY = padT + innerH;
    const n = values.length;
    const gap = n > 8 ? 2 : 5;
    const bw = n ? Math.max(2, (innerW - gap * (n - 1)) / n) : 0;

    const svg = root(W, H);
    baseline(svg, padL, baseY, W - padR);
    values.forEach((v, i) => {
      if (!v) return;
      const h = Math.max(2, (Math.min(v, max) / max) * innerH);
      const x = padL + i * (bw + gap);
      const y = baseY - h;
      const rect = el("rect", {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(bw * 10) / 10,
        height: Math.round(h * 10) / 10,
        rx: Math.min(3, bw / 2),
        fill: color
      });
      if (labels[i] !== undefined && labels[i] !== null) {
        rect.appendChild(el("title", null, labels[i]));
      }
      svg.appendChild(rect);
    });
    return svg;
  }

  function donut(segments, opts) {
    opts = opts || {};
    const size = opts.size || 150;
    const thickness = opts.thickness || 26;
    const center = opts.center;
    const cx = size / 2;
    const cy = size / 2;
    const r = (size - thickness) / 2;
    const C = 2 * Math.PI * r;
    const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);

    const svg = root(size, size);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.appendChild(
      el("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "rgba(148, 163, 184, 0.14)", "stroke-width": thickness })
    );
    if (total > 0) {
      let offset = 0;
      for (const seg of segments) {
        const v = seg.value || 0;
        if (v <= 0) continue;
        const frac = v / total;
        const len = Math.max(1, frac * C - 1.5);
        svg.appendChild(
          el("circle", {
            cx: cx,
            cy: cy,
            r: r,
            fill: "none",
            stroke: seg.color,
            "stroke-width": thickness,
            "stroke-dasharray": `${len} ${C - len}`,
            "stroke-dashoffset": String(-offset),
            transform: `rotate(-90 ${cx} ${cy})`
          })
        );
        offset += frac * C;
      }
    }
    if (center !== undefined && center !== null) {
      svg.appendChild(
        el(
          "text",
          {
            x: cx,
            y: cy + 1,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            fill: "#e2e8f0",
            "font-size": Math.round(size * 0.16),
            "font-weight": "700"
          },
          String(center)
        )
      );
    }
    return svg;
  }

  return { line, bars, donut };
})();
