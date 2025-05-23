window.addEventListener('load', () => {
  const parchment = document.querySelector('.parchment-container');
  const clip = document.querySelector('.parchment-clip');
  const edge = document.querySelector('.fake-right-edge');
  const message = document.querySelector('.message');

  // Corrige la ponctuation française
  message.textContent = applyFrenchSpacing(message.textContent);

  // Étape 1 : départ invisible
  parchment.classList.add('start-hidden');
  edge.classList.add('start-hidden');

  // Étape 2 : fade-in progressif après 1s
  setTimeout(() => {
    parchment.classList.add('fade-in');
    edge.classList.add('fade-in');
  }, 1000);

  // Étape 3 : apparition complète + animations d'ouverture
  setTimeout(() => {
    parchment.classList.remove('start-hidden');
    edge.classList.remove('start-hidden');
    parchment.classList.add('animate-in');
    clip.classList.add('animate-in'); // Ajouté
    edge.classList.add('animate-in');
    fitText(message);
  }, 1600); // fade-in + délai

  // Étape 4 : animations inverses (fermeture propre)
  setTimeout(() => {
    reverseAnimations();
  }, 7000); // suffisamment après ouverture

  // Étape 5 : disparition complète en fade-out après reverse
  setTimeout(() => {
    parchment.classList.add('fade-out');
    edge.classList.add('fade-out');
  }, 9000); // reverse = ~2.5s → fade-out ensuite
});


function applyFrenchSpacing(text) {
  return text.replace(/ ([!?;:»])/g, '\u00A0$1')
    .replace(/« /g, '«\u00A0');
}

function fitText(el, minSize = 10, maxSize = 160) {
  const container = el.parentElement;
  const originalClip = el.style.clipPath;
  el.style.clipPath = 'none';

  let fontSize = minSize;
  el.style.fontSize = fontSize + 'px';

  const containerStyle = window.getComputedStyle(container);
  const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
  const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

  const maxWidth = container.clientWidth - paddingX;
  const maxHeight = container.clientHeight - paddingY;
  while (
    el.scrollHeight <= maxHeight &&
    el.scrollWidth <= maxWidth &&
    fontSize < maxSize
  ) {
    fontSize++;
    el.style.fontSize = fontSize + 'px';
  }

  fontSize--;
  el.style.fontSize = fontSize + 'px';
  el.style.clipPath = originalClip;
}

window.addEventListener('resize', () => {
  const message = document.querySelector('.message');
  fitText(message);
});

function reverseAnimations() {
  const edge = document.querySelector('.fake-right-edge');
  const parchment = document.querySelector('.parchment-container');
  const clip = document.querySelector('.parchment-clip'); // Ajouté

  edge.classList.remove('reversed');
  parchment.classList.remove('parchment-reversed');
  clip.classList.remove('animate-in'); // Ajouté

  void edge.offsetWidth;
  void parchment.offsetWidth;


  edge.classList.add('reversed');
  parchment.classList.add('parchment-reversed');
  clip.classList.add('animate-out'); // Ajouté
}
