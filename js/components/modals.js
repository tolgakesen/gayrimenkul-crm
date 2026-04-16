// Generic modal system

export function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.classList.add('modal-open'); }
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.classList.remove('modal-open'); }
}

export function createModal(id, title, bodyHTML, footerHTML = '') {
  let m = document.getElementById(id);
  if (m) m.remove();
  m = document.createElement('div');
  m.id = id;
  m.className = 'modal-overlay';
  m.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close="${id}"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) closeModal(id); });
  m.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  if (window.lucide) window.lucide.createIcons();
  return m;
}

// Step wizard helper
export function showStep(form, step, total) {
  form.querySelectorAll('.step-panel').forEach((p, i) => p.classList.toggle('active', i === step));
  form.querySelectorAll('.step-indicator .step').forEach((s, i) => {
    s.classList.toggle('active', i === step);
    s.classList.toggle('done', i < step);
  });
  const prevBtn = form.querySelector('.btn-prev');
  const nextBtn = form.querySelector('.btn-next');
  const saveBtn = form.querySelector('.btn-save');
  if (prevBtn) prevBtn.style.display = step === 0 ? 'none' : '';
  if (nextBtn) nextBtn.style.display = step === total - 1 ? 'none' : '';
  if (saveBtn) saveBtn.style.display = step === total - 1 ? '' : 'none';
}

export function buildStepIndicator(steps) {
  return `<div class="step-indicator">${steps.map((s, i) => `<div class="step${i===0?' active':''}">${i+1}<span>${s}</span></div>`).join('<div class="step-line"></div>')}</div>`;
}
