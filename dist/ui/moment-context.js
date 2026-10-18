export function renderMomentContext(root, entry, reading = false) {
  root.dataset.reading = String(reading);
  if (reading) root.setAttribute('tabindex', '0');
  else root.removeAttribute('tabindex');
  root.querySelector('.moment-kicker span').textContent = reading ? '기록 다시 보기' : '지금 일어난 일';
  root.querySelector('[data-life="year-age"]').textContent = `${entry.year}년 · ${entry.age}세`;
  root.querySelector('#moment-copy').textContent = entry.text;
  root.scrollTop = 0;
}
