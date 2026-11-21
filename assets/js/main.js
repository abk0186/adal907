const shots = Array.from(document.querySelectorAll('.shot'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('img');
let shotIndex = 0;

function openShot(index) {
  shotIndex = (index + shots.length) % shots.length;
  const img = shots[shotIndex].querySelector('img');
  lightboxImg.src = img.currentSrc || img.src;
  lightboxImg.alt = img.alt;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeShot() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  document.body.style.overflow = '';
}

shots.forEach((shot, index) => {
  shot.querySelector('button').addEventListener('click', () => openShot(index));
});

lightbox.querySelector('.lb-close').addEventListener('click', closeShot);
lightbox.querySelector('.lb-prev').addEventListener('click', () => openShot(shotIndex - 1));
lightbox.querySelector('.lb-next').addEventListener('click', () => openShot(shotIndex + 1));
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeShot();
});

document.addEventListener('keydown', (event) => {
  if (lightbox.hidden) return;
  if (event.key === 'Escape') closeShot();
  if (event.key === 'ArrowLeft') openShot(shotIndex - 1);
  if (event.key === 'ArrowRight') openShot(shotIndex + 1);
});

let touchX = 0;
lightbox.addEventListener('touchstart', (event) => {
  touchX = event.changedTouches[0].clientX;
}, { passive: true });
lightbox.addEventListener('touchend', (event) => {
  const dx = event.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) < 48) return;
  openShot(shotIndex + (dx < 0 ? 1 : -1));
}, { passive: true });

const form = document.getElementById('lead-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const task = String(data.get('task') || '').trim();
  const tr = (key, fallback) => (window.adalT ? window.adalT(key) : fallback);
  const lines = [tr('wa.intro', 'Здравствуйте! Интересует мини-погрузчик ADAL MODEL 907.')];
  if (name) lines.push(`${tr('wa.name', 'Имя')}: ${name}`);
  if (phone) lines.push(`${tr('wa.phone', 'Телефон')}: ${phone}`);
  if (task) lines.push(`${tr('wa.task', 'Задача')}: ${task}`);
  const url = `https://wa.me/77003330999?text=${encodeURIComponent(lines.join('\n'))}`;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
});


const OPERATOR_WAGE = 400000;
const calcForm = document.getElementById("savings-calc");
const calcMonth = document.getElementById("calc-month");
const calcYear = document.getElementById("calc-year");
const calcNote = document.getElementById("calc-note");

function formatTenge(value) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  return `${n.toLocaleString("ru-RU").replace(/\s/g, "\u00a0")}\u00a0₸`;
}

function updateSavingsCalc() {
  if (!calcForm || !calcMonth || !calcYear || !calcNote) return;
  const workers = Number(calcForm.workers.value);
  const salary = Number(calcForm.salary.value);
  const months = Number(calcForm.months.value);
  const tr = (key, fallback) => (window.adalT ? window.adalT(key) : fallback);
  if (!Number.isFinite(workers) || !Number.isFinite(salary) || !Number.isFinite(months) || workers < 1 || months < 1 || salary < 0) {
    calcMonth.textContent = "—";
    calcYear.textContent = "—";
    return;
  }
  const monthly = Math.max(0, workers * salary - OPERATOR_WAGE);
  calcMonth.textContent = formatTenge(monthly);
  calcYear.textContent = formatTenge(monthly * months);
  calcNote.textContent = monthly > 0
    ? tr("calc.note", "Валовая экономия на оплате труда до расходов на топливо и обслуживание.")
    : tr("calc.zero", "При этих значениях экономии на оплате труда нет: фонд заменённых рабочих не выше зарплаты оператора.");
}

if (calcForm) {
  calcForm.addEventListener("input", updateSavingsCalc);
  calcForm.addEventListener("change", updateSavingsCalc);
  calcForm.addEventListener("submit", (event) => event.preventDefault());
  document.addEventListener("adal-lang-change", updateSavingsCalc);
  updateSavingsCalc();
}
