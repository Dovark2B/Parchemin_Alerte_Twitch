const DEBUG_MODE = false;
const SHOW_TEST_ALERT_ON_LOAD = false;

const defaultEventDisplayTime = 10000;
const supressGiftBombSubEvents = false;

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
        message: ["Merci [user] pour ton don de [amount] € !"],
        userMsg: ["[message]"]
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
    const typeNorm = eventInfo.type.replace(/\s+/g, '');
    return `${eventInfo.source}.${typeNorm}`;
}

function updateAlertContainer(data) {
    const eventName = getEventStamp(data?.event);
    if (!eventResponseStructure[eventName]) return;

    // Filtrage des small cheers
    if (eventName === "Twitch.Cheer" && (data?.data?.bits || 0) < 2) {
        if (DEBUG_MODE) console.log("Cheer ignoré : moins de 2 bits");
        return;
    }

    // On met simplement l’objet `data` dans la queue
    eventQueue.push(data);
    processEventQueue();
}

function processEventQueue() {
    // Si on affiche déjà un événement, on attend qu’il se termine
    if (showingEvent) return;
    // Si la queue est vide, rien à faire
    if (eventQueue.length === 0) return;

    // On passe en mode « affichage »
    showingEvent = true;

    const data = eventQueue.shift();
    handleEventDisplay(data, () => {
        // Quand l’affichage est fini, on libère et on relance
        showingEvent = false;
        processEventQueue();
    });
}

function handleEventDisplay(payload, onDone) {
    const { event, data: d } = payload;
    const eventName = getEventStamp(event);
    const structure = eventResponseStructure[eventName];
    let userName, recipient, bits, months, gifts, viewers, amount;

    // --- Récupération des champs (identique à avant) ---
    if (eventName === "Twitch.Raid") {
        userName = d.from_broadcaster_user_name || d.from_broadcaster_user_login || "Invité";
    } else {
        userName = d.user_name || d.user?.name || d.username || d.displayName || "Invité";
    }
    recipient = d.recipient?.name || d.recipientUser || d.recipientUserName || "LaMoche";
    bits = d.bits || "696969";
    months = d.cumulativeMonths || "69";
    gifts = d.gifts || "69";
    viewers = (eventName === "Twitch.Raid" ? d.viewers : (d.viewerCount || d.viewers)) || "696969";
    amount = d.amount || "0";

    // --- Génération du message HTML avec tokens ---
    let message = replaceToken(
        selectRandomItemFromArray(
            (d.isAnonymous && structure.anonMessage)
                ? structure.anonMessage
                : structure.message
        ),
        d
    )
        .replace(/\[user\]/g, `<span class="user">${userName}</span>`)
        .replace(/\[recipient\]/g, `<span class="recipient">${recipient}</span>`)
        .replace(/\[bits\]/g, `<span class="value">${bits}</span>`)
        .replace(/\[months\]/g, `<span class="month">${months}</span>`)
        .replace(/\[gifts\]/g, `<span class="gifts">${gifts}</span>`)
        .replace(/\[viewers\]/g, `<span class="viewers">${viewers}</span>`)
        .replace(/\[amount\]/g, `<span class="amount">${amount}</span>`);

    // --- Affichage principal ---
    showAlert(message);

    // Durée totale d’affichage
    const displayTime = defaultEventDisplayTime;

    // Gestion spécifique du message secondaire (donation)
    if (eventName === "TipeeeStream.Donation") {
        const userMsg = (typeof d.message === 'string') ? d.message.trim() : "";
        if (userMsg.length > 0) {
            // On planifie la deuxième alerte après la première
            setTimeout(() => {
                showAlert(`<span class="donor-message">${userMsg}</span>`, displayTime);
            }, displayTime);
            // On attend la fin de la seconde
            setTimeout(onDone, displayTime * 2);
            return;
        }
    }

    // Sinon on attend juste la fin de l’animation
    setTimeout(onDone, displayTime);
}

function launchAnimation(displayTime = defaultEventDisplayTime) {
    const parchment = document.querySelector('.parchment-container');
    const edge = document.querySelector('.fake-right-edge');
    const clip = document.querySelector('.parchment-clip');
    const messageEl = document.querySelector('.message');

    // 1. reset classes
    [parchment, edge, clip].forEach(el =>
        el.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed', 'reversed')
    );

    void parchment.offsetHeight; // reflow

    // 2. préparation à l'entrée
    parchment.classList.add('start-hidden');
    edge.classList.add('start-hidden');

    // 3. fade in
    setTimeout(() => {
        parchment.classList.add('fade-in');
        edge.classList.add('fade-in');
    }, 100);

    // 4. animate-in
    setTimeout(() => {
        parchment.classList.remove('start-hidden');
        edge.classList.remove('start-hidden');
        parchment.classList.add('animate-in');
        edge.classList.add('animate-in');
        clip.classList.add('animate-in');
        fitText(messageEl);
    }, 700);

    // 5. reverse au bout de 60% du displayTime
    setTimeout(reverseAnimations, displayTime * 0.6);

    // 6. fade-out au bout de 85% du displayTime
    setTimeout(() => {
        parchment.classList.add('fade-out');
        edge.classList.add('fade-out');
    }, displayTime * 0.85);
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
function fitText(el, minSize = 72, maxSize = 256) {
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

function makeTextFit(el, minSize = 72, maxSize = 256) {
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
    makeTextFit(message, 72, 256);
});

function showAlert(text = "Alerte", displayTime = defaultEventDisplayTime) {
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

    makeTextFit(messageDiv, 72, 256);

    launchAnimation(displayTime);
}

const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: "*",  // on veut **tout**
    onConnect: () => SetConnectionStatus(true),
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

    if (type.includes("donation") || type.includes("tipeee")) {
        if (DEBUG_MODE) console.log("CustomEvent donation ignoré pour éviter duplication");
        return;
    }

    // Source et type pour eventResponseStructure
    let eventSource = "Twitch";
    let eventType = "Follow";
    if (type.includes("sub") && type.includes("gift")) eventType = "GiftSub";
    else if (type.includes("gift bomb")) eventType = "GiftBomb";
    else if (type.includes("sub")) eventType = "Sub";
    else if (type.includes("follow")) eventType = "Follow";
    else if (type.includes("cheer") || type.includes("bits")) eventType = "Cheer";
    else if (type.includes("raid")) eventType = "Raid";

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
        makeTextFit(msg, 72, 256);
    }
});
