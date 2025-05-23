const previewArea = document.getElementById('preview-area');
const customText = document.getElementById('customText');
const fontFamily = document.getElementById('fontFamily');
const fontColor = document.getElementById('fontColor');
const showPseudo = document.getElementById('showPseudo');
const showAvatar = document.getElementById('showAvatar');

function renderPreview(type = "follow", pseudo = "Nutty", avatarUrl = "https://static-cdn.jtvnw.net/jtv_user_pictures/nutty-profile_image.png") {
  let text = customText.value;
  if (showPseudo.checked) text = text.replace("%pseudo%", pseudo);
  else text = text.replace("%pseudo%", "");
  let avatar = showAvatar.checked ? `<img src="${avatarUrl}" alt="avatar" class="avatar" style="width:48px;height:48px;border-radius:50%;margin-right:10px;">` : "";
  previewArea.innerHTML = `
    <div class="parchment-wrapper">
      <div class="parchment-container animate-in">
        <div class="parchment-clip animate-in">
          <div class="content-box" style="font-family:${fontFamily.value};color:${fontColor.value};">
            ${avatar}
            <span class="message">${text}</span>
          </div>
        </div>
      </div>
      <div class="fake-right-edge animate-in"></div>
    </div>
  `;
}

// Listeners pour les paramètres
[customText, fontFamily, fontColor, showPseudo, showAvatar].forEach(input => {
  input.addEventListener('input', () => renderPreview());
});

// Simulateurs d’alertes
document.getElementById('triggerFollow').onclick = () => renderPreview("follow", "Nutty");
document.getElementById('triggerSub').onclick = () => renderPreview("sub", "SuperSub");
document.getElementById('triggerCheer').onclick = () => renderPreview("cheer", "CheerMaster");

// Premier rendu
renderPreview();