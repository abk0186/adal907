import { initViewer } from './loader.js';

const stage = document.getElementById('stage');
initViewer(stage);

const shots = Array.from(document.querySelectorAll('.shot'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('img');
const lightboxCap = lightbox.querySelector('p');
let shotIndex = 0;

function openShot(index) {
  shotIndex = (index + shots.length) % shots.length;
  const img = shots[shotIndex].querySelector('img');
  const cap = shots[shotIndex].querySelector('figcaption');
  lightboxImg.src = img.currentSrc || img.src;
  lightboxImg.alt = img.alt;
  lightboxCap.textContent = cap ? cap.textContent : '';
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
  const lines = ['Здравствуйте! Интересует мини-погрузчик ADAL MODEL 907.'];
  if (name) lines.push(`Имя: ${name}`);
  if (phone) lines.push(`Телефон: ${phone}`);
  if (task) lines.push(`Задача: ${task}`);
  const url = `https://wa.me/77003330999?text=${encodeURIComponent(lines.join('\n'))}`;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
});
