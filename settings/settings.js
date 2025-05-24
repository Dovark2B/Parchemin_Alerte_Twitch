const followText = document.getElementById('followText');
const followColor = document.getElementById('followColor');
const subText = document.getElementById('subText');
const subColor = document.getElementById('subColor');
const bitsText = document.getElementById('bitsText');
const bitsColor = document.getElementById('bitsColor');
const raidText = document.getElementById('raidText');
const raidColor = document.getElementById('raidColor');
const fontFamily = document.getElementById('fontFamily');
const showPseudo = document.getElementById('showPseudo');
const showAvatar = document.getElementById('showAvatar');
const previewIframe = document.getElementById('preview-iframe');
const simButtons = [
  document.getElementById('triggerFollow'),
  document.getElementById('triggerSub'),
  document.getElementById('triggerBits'),
  document.getElementById('triggerRaid')
];
simButtons.forEach(btn => btn.disabled = true);

function updateAlertUrl() {
  const params = new URLSearchParams({
    followText: followText.value,
    followColor: followColor.value,
    subText: subText.value,
    subColor: subColor.value,
    bitsText: bitsText.value,
    bitsColor: bitsColor.value,
    raidText: raidText.value,
    raidColor: raidColor.value,
    fontFamily: fontFamily.value,
    showPseudo: showPseudo.checked,
    showAvatar: showAvatar.checked
  });
  const url = `${location.origin.replace('/settings','')}/?${params.toString()}`;
  document.getElementById('alertUrl').value = url;
}

function sendOptionsToIframe(type = null) {
  const iframe = document.getElementById('preview-iframe');
  iframe.contentWindow.postMessage({
    type: type || 'updateOptions',
    followText: followText.value,
    followColor: followColor.value,
    subText: subText.value,
    subColor: subColor.value,
    bitsText: bitsText.value,
    bitsColor: bitsColor.value,
    raidText: raidText.value,
    raidColor: raidColor.value,
    fontFamily: fontFamily.value,
    showPseudo: showPseudo.checked,
    showAvatar: showAvatar.checked
  }, '*');
}

// À chaque input, juste update l'aperçu statique
[
  followText, followColor, subText, subColor,
  bitsText, bitsColor, raidText, raidColor,
  fontFamily, showPseudo, showAvatar
].forEach(input => {
  input.addEventListener('input', () => {
    updateAlertUrl();
    sendOptionsToIframe(); // type = null => preview statique
  });
});

let animationLock = false;
const ANIMATION_DURATION = 9000; // ms, adapte à la durée réelle de ton animation

function triggerSim(type) {
  if (animationLock) return;
  animationLock = true;
  sendOptionsToIframe(type);
  simButtons.forEach(btn => btn.disabled = true);
  setTimeout(() => {
    animationLock = false;
    simButtons.forEach(btn => btn.disabled = false);
  }, ANIMATION_DURATION);
}

document.getElementById('triggerFollow').onclick = () => triggerSim('follow');
document.getElementById('triggerSub').onclick = () => triggerSim('sub');
document.getElementById('triggerBits').onclick = () => triggerSim('bits');
document.getElementById('triggerRaid').onclick = () => triggerSim('raid');

previewIframe.addEventListener('load', () => {
  simButtons.forEach(btn => btn.disabled = false);
  // Envoie les options à l'iframe dès qu'elle est prête
  sendOptionsToIframe();
});