import { KOREA_REGION_SHAPES, KOREA_MAP_VIEWBOX } from '../data/korea-regions.js';
import { REGIONS } from '../data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FULL_VIEW = [0, 0, KOREA_MAP_VIEWBOX.width, KOREA_MAP_VIEWBOX.height];

// 다른 지역 안에 들어 있는 시. 바깥 지역이 떠오를 때 함께 떠올라야 구멍처럼 어긋나지 않는다.
const ENCLAVES = {
  GGD: ['SEL', 'ICN'],
  GBK: ['DGU'],
  JNM: ['GJU'],
  CNM: ['SJN', 'DJN'],
  CBK: ['SJN', 'DJN'],
  GNM: ['BSN', 'USN'],
};

const REGION_BY_CODE = Object.fromEntries(REGIONS.map((region) => [region.code, region]));
const TOTAL_WEIGHT = REGIONS.reduce((sum, region) => sum + region.weight, 0);

export function regionProbability(code) {
  const region = REGION_BY_CODE[code];
  if (!region) return 0;
  return Math.round((region.weight / TOTAL_WEIGHT) * 1000) / 10;
}

export function regionLabel(code) {
  return REGION_BY_CODE[code]?.name ?? code;
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function htmlNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function probabilityLine(code) {
  const line = htmlNode('span', 'kmap-probability');
  line.append('태어날 확률 ', htmlNode('b', '', `${regionProbability(code)}%`));
  return line;
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/**
 * 17개 시도 지도를 만든다.
 * - 마우스를 올리면 지역이 초록으로 칠해지며 떠오르고, 확률 툴팁이 뜬다.
 * - 클릭(또는 Enter)하면 그 지역으로 확대되고, 「전국 지도」로 돌아올 수 있다.
 * - setBirth(code, label)로 출생 지역 마커를 표시한다.
 */
export function createKoreaMap(host, { interactive = true, label = '대한민국 17개 시도 지도' } = {}) {
  if (!host) return null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const root = htmlNode('div', 'kmap');
  root.dataset.interactive = String(interactive);
  const svg = svgNode('svg', {
    class: 'kmap-svg',
    viewBox: FULL_VIEW.join(' '),
    role: 'group',
    'aria-label': label,
    preserveAspectRatio: 'xMidYMid meet',
  });
  const regionLayer = svgNode('g', { class: 'kmap-regions' });
  const markerLayer = svgNode('g', { class: 'kmap-marker', 'aria-hidden': 'true' });
  markerLayer.style.display = 'none';
  for (const radius of [26, 15, 8]) markerLayer.append(svgNode('circle', { class: `kmap-marker-ring kmap-marker-ring-${radius}`, r: radius }));
  markerLayer.append(svgNode('circle', { class: 'kmap-marker-dot', r: 4.5 }));
  svg.append(regionLayer, markerLayer);

  const groups = new Map();
  for (const shape of KOREA_REGION_SHAPES) {
    const group = svgNode('g', { class: 'kmap-region-group', transform: `translate(${shape.x} ${shape.y})` });
    const path = svgNode('path', { class: 'kmap-region', d: shape.d });
    path.dataset.code = shape.code;
    if (interactive) {
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', `${regionLabel(shape.code)}, 태어날 확률 ${regionProbability(shape.code)}%`);
    }
    group.append(path);
    regionLayer.append(group);
    groups.set(shape.code, { group, path, shape });
  }

  const tooltip = htmlNode('div', 'kmap-tooltip');
  tooltip.hidden = true;
  tooltip.setAttribute('aria-hidden', 'true');
  const tooltipName = htmlNode('strong', 'kmap-tooltip-name');
  const tooltipLine = htmlNode('span', 'kmap-probability');
  tooltip.append(tooltipName, tooltipLine);

  const birthLabel = htmlNode('div', 'kmap-birth-label');
  birthLabel.hidden = true;

  const back = htmlNode('button', 'kmap-back');
  back.type = 'button';
  back.hidden = true;
  back.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg><span>전국 지도</span>';

  const zoomTitle = htmlNode('div', 'kmap-zoom-title');
  zoomTitle.hidden = true;
  zoomTitle.setAttribute('aria-live', 'polite');

  root.append(svg, birthLabel, tooltip, back, zoomTitle);
  host.replaceChildren(root);

  let viewBox = [...FULL_VIEW];
  let animation = 0;
  let zoomedCode = null;
  let hoveredCode = null;
  let birthCode = null;

  function setViewBox(values) {
    viewBox = values;
    svg.setAttribute('viewBox', values.map((value) => value.toFixed(2)).join(' '));
    positionBirthLabel();
  }

  function animateViewBox(target) {
    cancelAnimationFrame(animation);
    if (reduceMotion?.matches) {
      setViewBox(target);
      return;
    }
    const from = [...viewBox];
    const start = performance.now();
    const duration = 650;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const k = easeInOut(t);
      setViewBox(from.map((value, index) => value + (target[index] - value) * k));
      if (t < 1) animation = requestAnimationFrame(step);
    };
    animation = requestAnimationFrame(step);
  }

  function raise(code) {
    const entry = groups.get(code);
    if (!entry) return;
    regionLayer.append(entry.group);
    for (const child of ENCLAVES[code] ?? []) {
      const enclave = groups.get(child);
      if (enclave) regionLayer.append(enclave.group);
    }
  }

  function setLifted(code, lifted) {
    groups.get(code)?.path.classList.toggle('is-hovered', lifted);
    for (const child of ENCLAVES[code] ?? []) groups.get(child)?.path.classList.toggle('is-lifted-with-parent', lifted);
  }

  function showTooltip(code, clientX, clientY) {
    tooltipName.textContent = regionLabel(code);
    tooltipLine.replaceChildren('태어날 확률 ', htmlNode('b', '', `${regionProbability(code)}%`));
    const box = root.getBoundingClientRect();
    let x = clientX;
    let y = clientY;
    if (x === undefined) {
      const point = svgPointToClient(groups.get(code).shape.cx, groups.get(code).shape.cy);
      x = point.x;
      y = point.y;
    }
    tooltip.hidden = false;
    const left = Math.min(Math.max(x - box.left + 18, 8), box.width - tooltip.offsetWidth - 8);
    const top = Math.max(y - box.top - tooltip.offsetHeight - 14, 8);
    tooltip.style.transform = `translate(${left}px, ${top}px)`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function svgPointToClient(x, y) {
    const box = svg.getBoundingClientRect();
    const scale = Math.min(box.width / viewBox[2], box.height / viewBox[3]);
    const offsetX = (box.width - viewBox[2] * scale) / 2;
    const offsetY = (box.height - viewBox[3] * scale) / 2;
    return {
      x: box.left + offsetX + (x - viewBox[0]) * scale,
      y: box.top + offsetY + (y - viewBox[1]) * scale,
    };
  }

  function positionBirthLabel() {
    if (!birthCode || birthLabel.hidden) return;
    const shape = groups.get(birthCode)?.shape;
    if (!shape) return;
    const point = svgPointToClient(shape.cx, shape.cy);
    const box = root.getBoundingClientRect();
    birthLabel.style.transform = `translate(${point.x - box.left}px, ${point.y - box.top}px)`;
    markerLayer.setAttribute('transform', `translate(${shape.cx} ${shape.cy})`);
  }

  function hover(code, event) {
    if (zoomedCode) {
      if (code !== zoomedCode) return;
    }
    if (hoveredCode && hoveredCode !== code) setLifted(hoveredCode, false);
    hoveredCode = code;
    root.dataset.hover = code;
    if (!zoomedCode) {
      raise(code);
      setLifted(code, true);
    }
    showTooltip(code, event?.clientX, event?.clientY);
  }

  function unhover() {
    if (hoveredCode) setLifted(hoveredCode, false);
    hoveredCode = null;
    delete root.dataset.hover;
    hideTooltip();
  }

  function zoomTo(code) {
    const entry = groups.get(code);
    if (!entry) return;
    unhover();
    zoomedCode = code;
    root.dataset.zoom = code;
    for (const { path } of groups.values()) path.classList.toggle('is-zoomed', path.dataset.code === code);
    raise(code);
    const bbox = entry.path.getBBox();
    const pad = Math.max(bbox.width, bbox.height) * 0.28 + 12;
    const width = bbox.width + pad * 2;
    const height = bbox.height + pad * 2;
    const aspect = KOREA_MAP_VIEWBOX.width / KOREA_MAP_VIEWBOX.height;
    const finalWidth = Math.max(width, height * aspect);
    const finalHeight = finalWidth / aspect;
    const cx = entry.shape.x + bbox.x + bbox.width / 2;
    const cy = entry.shape.y + bbox.y + bbox.height / 2;
    animateViewBox([cx - finalWidth / 2, cy - finalHeight / 2, finalWidth, finalHeight]);
    back.hidden = false;
    zoomTitle.replaceChildren(htmlNode('strong', '', regionLabel(code)), probabilityLine(code));
    zoomTitle.hidden = false;
    host.dispatchEvent(new CustomEvent('kmap:zoom', { detail: { code } }));
  }

  function resetZoom() {
    if (!zoomedCode) return;
    zoomedCode = null;
    delete root.dataset.zoom;
    for (const { path } of groups.values()) path.classList.remove('is-zoomed');
    animateViewBox([...FULL_VIEW]);
    back.hidden = true;
    zoomTitle.hidden = true;
    host.dispatchEvent(new CustomEvent('kmap:zoom', { detail: { code: null } }));
  }

  if (interactive) {
    regionLayer.addEventListener('pointerover', (event) => {
      const path = event.target.closest?.('.kmap-region');
      if (path) hover(path.dataset.code, event);
    });
    regionLayer.addEventListener('pointermove', (event) => {
      const path = event.target.closest?.('.kmap-region');
      if (path && path.dataset.code === hoveredCode) showTooltip(hoveredCode, event.clientX, event.clientY);
    });
    regionLayer.addEventListener('pointerleave', unhover);
    // 떠오르는 애니메이션 때문에 누르는 순간 포인터가 경계를 벗어날 수 있어,
    // click 대신 누른 지역을 기억했다가 손을 뗄 때 확대한다.
    let pressedCode = null;
    regionLayer.addEventListener('pointerdown', (event) => {
      pressedCode = event.target.closest?.('.kmap-region')?.dataset.code ?? null;
    });
    window.addEventListener('pointerup', () => {
      const code = pressedCode;
      pressedCode = null;
      if (!code) return;
      if (zoomedCode === code) resetZoom();
      else zoomTo(code);
    });
    regionLayer.addEventListener('focusin', (event) => {
      const path = event.target.closest?.('.kmap-region');
      if (path) hover(path.dataset.code);
    });
    regionLayer.addEventListener('focusout', unhover);
    regionLayer.addEventListener('keydown', (event) => {
      const path = event.target.closest?.('.kmap-region');
      if (!path) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        zoomTo(path.dataset.code);
      }
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && zoomedCode) {
        event.stopPropagation();
        resetZoom();
      }
    });
    back.addEventListener('click', resetZoom);
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => positionBirthLabel()) : null;
  resizeObserver?.observe(root);

  return {
    element: root,
    zoomTo,
    resetZoom,
    setBirth(code, text) {
      for (const { path } of groups.values()) path.classList.toggle('is-birth', path.dataset.code === code);
      birthCode = code && groups.has(code) ? code : null;
      root.classList.toggle('has-birth', Boolean(birthCode));
      if (!birthCode) {
        markerLayer.style.display = 'none';
        birthLabel.hidden = true;
        return;
      }
      raise(birthCode);
      regionLayer.after(markerLayer);
      markerLayer.style.display = '';
      birthLabel.textContent = text ?? regionLabel(birthCode);
      birthLabel.hidden = false;
      requestAnimationFrame(positionBirthLabel);
    },
    destroy() {
      cancelAnimationFrame(animation);
      resizeObserver?.disconnect();
      host.replaceChildren();
    },
  };
}
