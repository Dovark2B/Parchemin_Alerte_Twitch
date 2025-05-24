const DEBUG_MODE = false;
const SHOW_TEST_ALERT_ON_LOAD = true;

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
        message: ["Merci [user] pour le sub offert !"]
    },
    "Twitch.GiftBomb": {
        title: ["[user] régale !"],
        message: ["[user] a offert [gifts] subs, merci !"]
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
    const eventName = getEventStamp(data?.event);
    const structure = eventResponseStructure[eventName];
    if (!structure) return;

    // Filtrer les cheers trop petits
    if (eventName === "Twitch.Cheer" && (data?.data?.bits || 0) < 2) {
        if (DEBUG_MODE) console.log("Cheer ignoré : moins de 2 bits");
        return;
    }

    const userName = data?.data?.user_name || data?.data?.user?.name || "DovarkLeBG";
    const recipient = data?.data?.recipient?.name || "LaMoche";
    const bits = data?.data?.bits || "696969";
    const months = data?.data?.cumulativeMonths || "69";
    const gifts = data?.data?.gifts || "69";
    const viewers = data?.data?.viewerCount || "696969";

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
        .replace(/\[viewers\]/g, `<span class="viewers">${viewers}</span>`);

    showAlert(message);
    triggerAnimation();
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


function fitText(el, minSize = 90, maxSize = 200) {
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

    while (el.scrollHeight <= maxHeight && el.scrollWidth <= maxWidth && fontSize < maxSize) {
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

    fitText(messageDiv);
    launchAnimation();
}

const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: "*",
    onConnect: (data) => {
        if (DEBUG_MODE) console.log("Connected to Streamer.bot:", data);
        SetConnectionStatus(true);
    },
    onDisconnect: () => {
        if (DEBUG_MODE) console.warn("Disconnected from Streamer.bot");
        SetConnectionStatus(false);
    },
    onData: (data) => {
        if (DEBUG_MODE) console.log("Streamer.bot event:", data);

        const eventName = getEventStamp(data?.event);
        if (Object.keys(eventResponseStructure).includes(eventName)) {
            updateAlertContainer(data);
            SetConnectionStatus(true);
        }
    }
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
                bits: 123,
                cumulativeMonths: 6,
                gifts: 5,
                viewerCount: 42
            }
        };

        updateAlertContainer(mockData);
    });
}
