const DEBUG_MODE = false;
const SHOW_TEST_ALERT_ON_LOAD = false;

const defaultEventDisplayTime = 10000;
const supressGiftBombSubEvents = true;

const synth = window.speechSynthesis;
const eventQueue = [];
let showingEvent = false;
let isTalking = false;
let intervalId = null;
let voices = [];
let giftSubIds = [];

const eventResponseStructure = {
    "Twitch.Follow": {
        title: ["Nouveau follower !"],
        message: ["[user] rejoint l'atelier !"]
    },
    "Twitch.Cheer": {
        title: ["Nouveau cheer !"],
        message: ["Merci [user] pour les [bits] bits !"]
    },
    "Twitch.Raid": {
        title: ["[user] débarque !"],
        message: ["[user] arrive avec sa clique de [viewers] personnes !"]
    },
    "Twitch.Sub": {
        title: ["Nouvel abonnement !"],
        message: ["[user] claque son PEL !"]
    },
    "Twitch.ReSub": {
        title: ["[user] revient encore !"],
        message: ["[user] est là depuis [months] mois, merci !"]
    },
    "Twitch.GiftSub": {
        title: ["[recipient] a reçu un sub !"],
        message: ["Merci [user] pour le sub offert a [recipient] !"]
    },
    "Twitch.GiftBomb": {
        title: ["[user] régale !"],
        message: ["[user] a offert [gifts] subs, merci !"]
    },
    "TipeeeStream.Donation": {
        title: ["Nouveau don ! 🎉"],
        message: ["Merci [user] pour ton don de [amount] € !"]
    }
};


function replaceToken(targetString, dataSet) {
    return targetString.replace(/{(\S*)}/g, function (m, key) {
        if (dataSet.hasOwnProperty(key)) {
            return dataSet[key];
        } else if (key.split(".").length > 1) {
            const keyparts = key.split(".");
            let objRef = dataSet;

            keyparts.forEach((part) => {
                if (objRef.hasOwnProperty(part)) {
                    objRef = objRef[part];
                } else {
                    objRef = null;
                }
            });
            return objRef ? objRef : "";
        }
    });
}

function selectRandomItemFromArray(items) {
    if (!items?.length) return null;
    return items[Math.floor(Math.random() * items.length)];
}

function getEventStamp(eventInfo) {
    if (!eventInfo) return null;
    return `${eventInfo.source}.${eventInfo.type}`;
}

function updateAlertContainer(data) {
    console.log("⚙️ Twitch.Raid payload.data:", data.data);
    const eventName = getEventStamp(data?.event);
    const structure = eventResponseStructure[eventName];
    if (!structure) return;

    // Filtrer les cheers trop petits
    if (eventName === "Twitch.Cheer" && (data?.data?.bits || 0) < 2) {
        if (DEBUG_MODE) console.log("Cheer ignoré : moins de 2 bits");
        return;
    }

    const userName =

        data?.data?.user_name    
        || data?.data?.user?.name       
        || data?.data?.username     
        || data?.data?.displayName  
        || "Invité";
    const recipient = data?.data?.recipient?.name
        || data?.data?.recipientUser
        || data?.data?.recipientUserName
        || "LaMoche";
    const bits = data?.data?.bits || "696969";
    const months = data?.data?.cumulativeMonths || "69";
    const gifts = data?.data?.gifts || "69";
    const viewers = data?.data?.viewerCount || data?.data?.viewers || "696969";
    const amount = data?.data?.amount || "0";

    let message = replaceToken(
        selectRandomItemFromArray(
            data?.data?.isAnonymous && structure.anonMessage
                ? structure.anonMessage
                : structure.message
        ),
        data.data
    );

    message = message
        .replace(/\[user\]/g, `<span class="user">${userName}</span>`)
        .replace(/\[recipient\]/g, `<span class="recipient">${recipient}</span>`)
        .replace(/\[bits\]/g, `<span class="value">${bits}</span>`)
        .replace(/\[months\]/g, `<span class="month">${months}</span>`)
        .replace(/\[gifts\]/g, `<span class="gifts">${gifts}</span>`)
        .replace(/\[viewers\]/g, `<span class="viewers">${viewers}</span>`)
        .replace(/\[amount\]/g, `<span class="amount">${amount}</span>`);

    showAlert(message);
}




function updateSoundEl(structure) {
    const soundEl = document.getElementById("sound");
    const soundFile = selectRandomItemFromArray(structure.sounds);
    if (soundEl && soundFile) {
        soundEl.src = soundFile;
    }
}

function launchAnimation(customMessage = null) {
    const parchment = document.querySelector('.parchment-container');
    const clip = document.querySelector('.parchment-clip');
    const edge = document.querySelector('.fake-right-edge');
    const message = document.querySelector('.message');

    if (customMessage) {
        message.innerHTML = applyFrenchSpacing(customMessage);
    }

    parchment.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed');
    edge.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'reversed');
    clip.classList.remove('animate-in', 'animate-out');

    void parchment.offsetHeight;

    parchment.classList.add('start-hidden');
    edge.classList.add('start-hidden');

    setTimeout(() => {
        parchment.classList.add('fade-in');
        edge.classList.add('fade-in');
    }, 100);

    setTimeout(() => {
        parchment.classList.remove('start-hidden');
        edge.classList.remove('start-hidden');
        parchment.classList.add('animate-in');
        edge.classList.add('animate-in');
        clip.classList.add('animate-in');
        fitText(message);
    }, 700);

    setTimeout(() => {
        reverseAnimations();
    }, 6000);

    setTimeout(() => {
        parchment.classList.add('fade-out');
        edge.classList.add('fade-out');
    }, 8500);
}

function reverseAnimations() {
    const edge = document.querySelector('.fake-right-edge');
    const parchment = document.querySelector('.parchment-container');
    const clip = document.querySelector('.parchment-clip');

    edge.classList.remove('reversed');
    parchment.classList.remove('parchment-reversed');
    clip.classList.remove('animate-in');

    void edge.offsetWidth;
    void parchment.offsetWidth;

    edge.classList.add('reversed');
    parchment.classList.add('parchment-reversed');
    clip.classList.add('animate-out');
}

function applyFrenchSpacing(text) {
    // Ne modifie pas l'intérieur des balises HTML
    return text.replace(/(?<!>) ([!?;:»])/g, '\u00A0$1') // espace insécable
        .replace(/« /g, '«\u00A0');
}


/**
 * Ajuste dynamiquement la taille de police d'un élément pour qu'il occupe
 * tout l'espace disponible sans déborder (sauf une petite tolérance), 
 * en restant entre minSize et maxSize (px).
 */
function fitText(el, minSize = 120, maxSize = 200) {
    const container = el.parentElement;
    if (!container) return;

    // Désactiver temporairement le clip-path pour mesurer correctement
    const originalClip = el.style.clipPath;
    el.style.clipPath = 'none';

    // Autoriser le wrapping et forcer box-sizing pour ne pas avoir de calculs bizarres
    el.style.whiteSpace = 'normal';
    el.style.display = 'inline-block';
    el.style.boxSizing = 'border-box';

    // Récupérer le padding du parent
    const containerStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

    // Calculer l'espace dispo à l'intérieur du parent
    const maxWidth = container.clientWidth - paddingX;
    const maxHeight = container.clientHeight - paddingY;

    // Fixer la largeur pour que le texte wrap correctement
    el.style.width = maxWidth + 'px';

    // On autorise un débord de hauteur de 5 % pour laisser la police plus large
    const heightTolerance = maxHeight * 0.05;

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    function fits(fontSize) {
        el.style.fontSize = fontSize + 'px';
        // On accepte scrollHeight jusqu'à maxHeight + tolerance
        return (
            el.scrollWidth <= maxWidth &&
            el.scrollHeight <= (maxHeight + heightTolerance)
        );
    }

    if (!fits(low)) {
        let testSize = low;
        while (testSize > 1 && !fits(testSize)) {
            testSize = Math.floor(testSize * 0.9);
        }
        best = Math.max(testSize, 1);
    } else {
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (fits(mid)) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
    }

    el.style.fontSize = best + 'px';
    el.style.clipPath = originalClip;
}

function makeTextFit(el, minSize = 120, maxSize = 200) {
    fitText(el, minSize, maxSize);

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            fitText(el, minSize, maxSize);
        });
        ro.observe(el.parentElement);
    } else {
        window.addEventListener('resize', () => {
            fitText(el, minSize, maxSize);
        });
    }
}



window.addEventListener('resize', () => {
    const message = document.querySelector('.message');
    makeTextFit(message, 120, 200);
});

function showAlert(text = "Alerte") {
    const messageDiv = document.querySelector('.message');
    const parchment = document.querySelector('.parchment-container');
    const clip = document.querySelector('.parchment-clip');
    const edge = document.querySelector('.fake-right-edge');

    parchment.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed');
    edge.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'reversed');
    clip.classList.remove('animate-in', 'animate-out');
    void parchment.offsetHeight;

    messageDiv.innerHTML = text;
    messageDiv.style.fontFamily = "'Cinzel', Georgia, serif";
    messageDiv.style.color = "#331e01";

    makeTextFit(messageDiv, 120, 200);

    launchAnimation();
}

const client = new StreamerbotClient({
  host: "127.0.0.1",
  port: 8080,
  subscribe: "*",  // on veut **tout**
  onConnect:    () => SetConnectionStatus(true),
  onDisconnect: () => SetConnectionStatus(false),
  onData: (payload) => {
    if (!payload.event) return;
    const eventName = `${payload.event.source}.${payload.event.type}`;

    // 1) Si c'est un event couché dans eventResponseStructure → alert normale
    if (eventResponseStructure[eventName]) {
      updateAlertContainer(payload);
      return;
    }

    // 2) Si c'est un Custom (test trigger) → on rebalance via CustomEvent
    if (payload.event.source === "General" && payload.event.type === "Custom") {
      window.dispatchEvent(
        new CustomEvent("CustomEvent", { detail: payload.data })
      );
    }
  }
});


window.addEventListener('open', () => {
    console.log(`✨ WS connecté à ${WS_URL}`);

    // On s'abonne aux événements Custom (catégorie General)
    window.send(JSON.stringify({
        request: "Subscribe",
        id: "sub_custom",
        events: {
            "General": ["Custom"]
        }
    }));
});

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

if (SHOW_TEST_ALERT_ON_LOAD) {
    window.addEventListener("load", () => {
        const keys = Object.keys(eventResponseStructure);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const [source, type] = randomKey.split(".");

        const mockData = {
            event: { source, type },
            data: {
                user_name: "DovarkleBG",
                user: { name: "DodoLeBG" },
                recipient: { name: "LaMoche" },
                bits: 12300,
                cumulativeMonths: 6,
                gifts: 5,
                viewerCount: 5000,
            }
        };

        updateAlertContainer(mockData);
    });
}



window.addEventListener("CustomEvent", (event) => {
    const data = event.detail || {};

    // Ajoute ce log pour voir toutes les variables reçues
    console.log("CustomEvent reçu :", data);

    // Type d'event
    const type = (data.type || "follow").toLowerCase();

    // Source et type pour eventResponseStructure
    let eventSource = "Twitch";
    let eventType = "Follow";
    if (type.includes("sub") && type.includes("gift")) eventType = "GiftSub";
    else if (type.includes("giftbomb")) eventType = "GiftBomb";
    else if (type.includes("sub")) eventType = "Sub";
    else if (type.includes("follow")) eventType = "Follow";
    else if (type.includes("cheer") || type.includes("bits")) eventType = "Cheer";
    else if (type.includes("raid")) eventType = "Raid";
    else if (type.includes("donation") || type.includes("tipeee")) {
        eventSource = "TipeeeStream";
        eventType = "Donation";
    }

    // Utilise directement les variables du trigger
    const fakeData = {
        event: {
            source: eventSource,
            type: eventType
        },
        data: {
            user_name: data.userName || data.user || data.username || "ViewerTest",
            user: { name: data.userName || data.user || data.username || "ViewerTest" },
            recipient: { name: data.recipientUser || data.recipientUserName || "LaMoche" },
            bits: data.bits,
            cumulativeMonths: data.months,
            gifts: data.gifts,
            viewerCount: data.viewers,
            amount: data.amount,
            message: data.message,
            currency: data.currency,
            // ...
        }
    };

    updateAlertContainer(fakeData);
});

window.addEventListener('load', () => {
    const msg = document.querySelector('.message');
    if (msg) {
        // On veut une police mini=120px, maxi=200px
        makeTextFit(msg, 120, 200);
    }
});
