window.currentOptions = {};

const sbServerAddress = "127.0.0.1";
const sbServerPort = "8080";
const showTwitchSubs = true;
//Streamer.bot WebSocket Client

const client = new StreamerbotClient({
  host: sbServerAddress,
  port: sbServerPort,

  onConnect: (data) => {
    console.log(`Streamer.bot successfully connected to ${sbServerAddress}:${sbServerPort}`)
    console.debug(data);
    SetConnectionStatus(true);
  },

  onDisconnect: () => {
    console.error(`Streamer.bot disconnected from ${sbServerAddress}:${sbServerPort}`)
    SetConnectionStatus(false);
  }
});

client.on('Twitch.Follow', (response) => {
  console.debug(response.data);
  TwitchFollow(response.data);
})

client.on('Twitch.Cheer', (response) => {
  console.debug(response.data);
  TwitchChatMessage(response.data);
})

client.on('Twitch.Sub', (response) => {
  console.debug(response.data);
  TwitchSub(response.data);
})

client.on('Twitch.ReSub', (response) => {
  console.debug(response.data);
  TwitchResub(response.data);
})

client.on('Twitch.GiftSub', (response) => {
  console.debug(response.data);
  TwitchGiftSub(response.data);
})

client.on('Twitch.Raid', (response) => {
  console.debug(response.data);
  TwitchRaid(response.data);
})


// Connexion à Streamer.bot 
function SetConnectionStatus(connected) {
  let statusContainer = document.getElementById("statusContainer");
  if (connected) {
    statusContainer.style.background = "#2FB774";
    statusContainer.innerText = "Connected!";
    statusContainer.style.opacity = 1;
    setTimeout(() => {
      statusContainer.style.transition = "all 2s ease";
      statusContainer.style.opacity = 0;
    }, 10);
  }
  else {
    statusContainer.style.background = "#D12025";
    statusContainer.innerText = "Connecting...";
    statusContainer.style.transition = "";
    statusContainer.style.opacity = 1;
  }
}

const urlParams = new URLSearchParams(window.location.search);

const followText = urlParams.get("followText") || "Merci du follow %pseudo% !";
const followColor = urlParams.get("followColor") || "#331e01";
const subText = urlParams.get("subText") || "Merci pour le sub %pseudo% !";
const subColor = urlParams.get("subColor") || "#007bff";
const bitsText = urlParams.get("bitsText") || "Merci pour les bits %pseudo% !";
const bitsColor = urlParams.get("bitsColor") || "#a100ff";
const raidText = urlParams.get("raidText") || "Raid de %pseudo% !";
const raidColor = urlParams.get("raidColor") || "#ff0055";
const fontFamily = urlParams.get("fontFamily") || "Georgia, serif";
const showPseudo = urlParams.get("showPseudo") !== "false";
const showAvatar = urlParams.get("showAvatar") !== "false";

// Fonction générique pour chaque type d’alerte
function showAlert(type, pseudo = "ViewerTest", opts = {}) {
  const messageDiv = document.querySelector('.message');
  const parchment = document.querySelector('.parchment-container');
  const clip = document.querySelector('.parchment-clip');
  const edge = document.querySelector('.fake-right-edge');
  let text, color, fontFamilyValue, showPseudoValue, showAvatarValue;

  // --- RESET complet avant toute modif ---
  parchment.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed');
  edge.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'reversed');
  clip.classList.remove('animate-in', 'animate-out');
  void parchment.offsetHeight; // force reflow

  // --- Applique les options ---
  switch(type) {
    case "follow":
      text = (opts.followText || followText);
      color = opts.followColor || followColor;
      break;
    case "sub":
      text = (opts.subText || subText);
      color = opts.subColor || subColor;
      break;
    case "bits":
      text = (opts.bitsText || bitsText);
      color = opts.bitsColor || bitsColor;
      break;
    case "raid":
      text = (opts.raidText || raidText);
      color = opts.raidColor || raidColor;
      break;
    default:
      text = "Alerte";
      color = "#331e01";
  }

  fontFamilyValue = opts.fontFamily || fontFamily || "Georgia, serif";
  showPseudoValue = typeof opts.showPseudo === "boolean" ? opts.showPseudo : showPseudo;
  showAvatarValue = typeof opts.showAvatar === "boolean" ? opts.showAvatar : showAvatar;

  if (showPseudoValue) {
    text = text.replace('%pseudo%', pseudo);
  } else {
    text = text.replace('%pseudo%', '');
  }

  messageDiv.textContent = text;
  messageDiv.style.color = color;
  messageDiv.style.fontFamily = fontFamilyValue;
  messageDiv.style.fontSize = ""; // Laisse fitText gérer la taille

  // Affichage de l'avatar si besoin
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.style.display = showAvatarValue ? '' : 'none';

  fitText(messageDiv);
  launchAnimation();
}

// Pour la preview dynamique
window.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'updateOptions') {
    window.currentOptions = event.data;
    applyOptionsToPreview(event.data);
  }

  if (['follow', 'sub', 'bits', 'raid'].includes(event.data.type)) {
    showAlert(event.data.type, "ViewerTest", window.currentOptions || {});
  }
});

function applyOptionsToPreview(opts) {
  const messageDiv = document.querySelector('.message');
  if (!messageDiv) return;
  messageDiv.style.fontFamily = opts.fontFamily;
  messageDiv.style.color = opts.followColor;
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.style.display = opts.showAvatar ? '' : 'none';
  let text = opts.followText || "Merci du follow %pseudo% !";
  if (opts.showPseudo) {
    text = text.replace('%pseudo%', 'ViewerTest');
  } else {
    text = text.replace('%pseudo%', '');
  }
  messageDiv.textContent = text;
  fitText(messageDiv);
}


// Effets d'animation pour le parchemin
function launchAnimation(customMessage = null) {
  const parchment = document.querySelector('.parchment-container');
  const clip = document.querySelector('.parchment-clip');
  const edge = document.querySelector('.fake-right-edge');
  const message = document.querySelector('.message');

  if (customMessage) {
    message.textContent = applyFrenchSpacing(customMessage);
  }

  // 🔄 Supprime toutes les classes liées aux animations
  parchment.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed');
  edge.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'reversed');
  clip.classList.remove('animate-in', 'animate-out');

  // 🔄 Forcer le reflow pour "remettre à zéro" proprement
  void parchment.offsetHeight;

  // 🔒 Étape 1 : cacher tout
  parchment.classList.add('start-hidden');
  edge.classList.add('start-hidden');

  // ✅ Étape 2 : fade-in progressif
  setTimeout(() => {
    parchment.classList.add('fade-in');
    edge.classList.add('fade-in');
  }, 100);

  // 🎬 Étape 3 : animation déroulement
  setTimeout(() => {
    parchment.classList.remove('start-hidden');
    edge.classList.remove('start-hidden');
    parchment.classList.add('animate-in');
    edge.classList.add('animate-in');
    clip.classList.add('animate-in');
    fitText(message);
  }, 700);

  // 🔁 Étape 4 : déroulement inverse
  setTimeout(() => {
    reverseAnimations();
  }, 6000);

  // 🧼 Étape 5 : fade out
  setTimeout(() => {
    parchment.classList.add('fade-out');
    edge.classList.add('fade-out');
  }, 8500);
}


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
async function TwitchSub(data) {
  if (!showTwitchSubs)
    return;

  // Récupère le pseudo
  const username = data.user.name;

  // Sélectionne le div message
  const messageDiv = document.querySelector('.message'); // ou '#messageDiv' si tu utilises un id

  // Modifie le texte du message
  messageDiv.textContent = `${username} s'est abonné !`;

  // Lance l'animation
  launchAnimation();
}
