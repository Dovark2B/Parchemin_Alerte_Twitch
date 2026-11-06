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

// Clés au format : "triggerCategory.triggerName"
const eventResponseStructure = {
    "Twitch/Channel.Follow": {
        title: ["Nouveau follower !"],
        message: ["[user] rejoint l'atelier !"]
    },
    "Twitch/Chat.Cheer": {
        title: ["Nouveau cheer !"],
        message: ["Merci [user] pour les [bits] bits !"]
    },
    "Twitch/Raid.Raid": {
        title: ["[user] débarque !"],
        message: ["[user] arrive avec sa clique de [viewers] personnes !"]
    },
    "Twitch/Subscriptions.Subscription": {
        title: ["Nouvel abonnement !"],
        message: ["[user] claque son PEL !"]
    },
    "Twitch/Subscriptions.ReSub": {
        title: ["[user] revient encore !"],
        message: ["[user] est là depuis [months] mois, merci !"]
    },
    "Twitch/Subscriptions.GiftSub": {
        title: ["[recipient] a reçu un sub !"],
        message: ["Merci [user] pour le sub offert a [recipient] !"]
    },
    "Twitch/Subscriptions.GiftBomb": {
        title: ["[user] régale !"],
        message: ["[user] a offert [gifts] subs, merci !"]
    },
    "Integrations/TipeeeStream.Donation": {
        title: ["Nouveau don ! 🎉"],
        message: ["Merci [user] pour ton don de [amount] € !"],
        userMsg: ["[message]"]
    }
};

function getNumberFrom(obj, keys) {
    if (!obj) return null;
    for (const k of keys) {
        const parts = k.split('.');
        let ref = obj;
        for (const p of parts) {
            if (ref && Object.prototype.hasOwnProperty.call(ref, p)) ref = ref[p];
            else { ref = undefined; break; }
        }
        const n = Number(ref);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function replaceToken(targetString, dataSet) {
    if (!targetString) return "";
    return targetString.replace(/{(\S*)}/g, function (m, key) {
        if (dataSet.hasOwnProperty(key)) {
            return dataSet[key];
        } else if (key.split(".").length > 1) {
            const keyparts = key.split(".");
            let objRef = dataSet;
            keyparts.forEach((part) => {
                if (objRef && objRef.hasOwnProperty(part)) {
                    objRef = objRef[part];
                } else {
                    objRef = null;
                }
            });
            return objRef ? objRef : "";
        }
        return "";
    });
}

function selectRandomItemFromArray(items) {
    if (!items?.length) return null;
    return items[Math.floor(Math.random() * items.length)];
}

function updateAlertContainer(normalizedData) {
    const eventKey = normalizedData.eventKey;
    if (!eventResponseStructure[eventKey]) {
        if (DEBUG_MODE) console.log("Événement non configuré dans la structure :", eventKey);
        return;
    }

    // Filtrage des small cheers (< 2 bits)
    if (eventKey === "Twitch/Chat.Cheer" && (normalizedData.args.bits || 0) < 2) {
        if (DEBUG_MODE) console.log("Cheer ignoré : moins de 2 bits");
        return;
    }

    eventQueue.push(normalizedData);
    processEventQueue();
}

function processEventQueue() {
    if (showingEvent) return;
    if (eventQueue.length === 0) return;

    showingEvent = true;
    const item = eventQueue.shift();
    handleEventDisplay(item, () => {
        showingEvent = false;
        processEventQueue();
    });
}

function handleEventDisplay(item, onDone) {
    const { eventKey, args: d } = item;
    const structure = eventResponseStructure[eventKey];

    const userName = d.user || d.userName || d.username || d.displayName || "Invité";
    const recipient = d.recipientUser || d.recipientUserName || d.recipient || "LaMoche";
    const bits = (d.bits ?? 0).toString();
    const months = (d.cumulativeMonths ?? d.months ?? 0).toString();

    const giftsNum = getNumberFrom(d, ["gifts", "totalGifts", "total", "count", "quantity", "giftCount"]);
    const gifts = (giftsNum ?? 0).toString();

    const viewers = (d.viewers ?? d.viewerCount ?? 0).toString();
    const amount = (d.amount ?? 0).toString();

    let message = replaceToken(
        selectRandomItemFromArray(
            (d.isAnonymous && structure.anonMessage) ? structure.anonMessage : structure.message
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

    showAlert(message);

    const displayTime = defaultEventDisplayTime;

    // Gestion du message secondaire (ex: donation TipeeeStream)
    if (eventKey === "Integrations/TipeeeStream.Donation") {
        const userMsg = (typeof d.message === 'string') ? d.message.trim() : "";
        if (userMsg.length > 0) {
            setTimeout(() => {
                showAlert(`<span class="donor-message">${userMsg}</span>`, displayTime);
            }, displayTime);
            setTimeout(onDone, displayTime * 2);
            return;
        }
    }

    setTimeout(onDone, displayTime);
}

function launchAnimation(displayTime = defaultEventDisplayTime) {
    const parchment = document.querySelector('.parchment-container');
    const edge = document.querySelector('.fake-right-edge');
    const clip = document.querySelector('.parchment-clip');
    const messageEl = document.querySelector('.message');

    [parchment, edge, clip].forEach(el =>
        el && el.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed', 'reversed')
    );

    if (parchment) void parchment.offsetHeight;

    if (parchment && edge) {
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
            if (clip) clip.classList.add('animate-in');
            fitText(messageEl);
        }, 700);

        setTimeout(reverseAnimations, displayTime * 0.6);

        setTimeout(() => {
            parchment.classList.add('fade-out');
            edge.classList.add('fade-out');
        }, displayTime * 0.85);
    }
}

function reverseAnimations() {
    const edge = document.querySelector('.fake-right-edge');
    const parchment = document.querySelector('.parchment-container');
    const clip = document.querySelector('.parchment-clip');

    if (!edge || !parchment) return;

    edge.classList.remove('reversed');
    parchment.classList.remove('parchment-reversed');
    if (clip) clip.classList.remove('animate-in');

    void edge.offsetWidth;
    void parchment.offsetWidth;

    edge.classList.add('reversed');
    parchment.classList.add('parchment-reversed');
    if (clip) clip.classList.add('animate-out');
}

function fitText(el, minSize = 72, maxSize = 256) {
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;

    const originalClip = el.style.clipPath;
    el.style.clipPath = 'none';

    el.style.whiteSpace = 'normal';
    el.style.display = 'inline-block';
    el.style.boxSizing = 'border-box';

    const containerStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

    const maxWidth = container.clientWidth - paddingX;
    const maxHeight = container.clientHeight - paddingY;

    el.style.width = maxWidth + 'px';
    const heightTolerance = maxHeight * 0.05;

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    function fits(fontSize) {
        el.style.fontSize = fontSize + 'px';
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
    if (typeof ResizeObserver !== 'undefined' && el.parentElement) {
        const ro = new ResizeObserver(() => fitText(el, minSize, maxSize));
        ro.observe(el.parentElement);
    } else {
        window.addEventListener('resize', () => fitText(el, minSize, maxSize));
    }
}

function showAlert(text = "Alerte", displayTime = defaultEventDisplayTime) {
    const messageDiv = document.querySelector('.message');
    const parchment = document.querySelector('.parchment-container');
    const clip = document.querySelector('.parchment-clip');
    const edge = document.querySelector('.fake-right-edge');

    if (!messageDiv) return;

    if (parchment) parchment.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'parchment-reversed');
    if (edge) edge.classList.remove('fade-in', 'fade-out', 'animate-in', 'start-hidden', 'reversed');
    if (clip) clip.classList.remove('animate-in', 'animate-out');
    if (parchment) void parchment.offsetHeight;

    messageDiv.innerHTML = text;
    messageDiv.style.fontFamily = "'Cinzel', Georgia, serif";
    messageDiv.style.color = "#331e01";

    makeTextFit(messageDiv, 72, 256);
    launchAnimation(displayTime);
}

function SetConnectionStatus(connected) {
    const statusContainer = document.getElementById("statusContainer");
    if (!statusContainer) return;
    if (connected) {
        statusContainer.style.background = "#2FB774";
        statusContainer.innerText = "Connected!";
        statusContainer.style.opacity = 1;
        setTimeout(() => {
            statusContainer.style.transition = "all 2s ease";
            statusContainer.style.opacity = 0;
        }, 10);
    } else {
        statusContainer.style.background = "#D12025";
        statusContainer.innerText = "Connecting...";
        statusContainer.style.transition = "";
        statusContainer.style.opacity = 1;
    }
}

// Initialisation du client Streamerbot officiel
const client = new StreamerbotClient({
    host: "127.0.0.1",
    port: 8080,
    subscribe: {
        "Raw": ["Action"] // On écoute uniquement les actions déclenchées (évite les inputs et ActionCompleted)
    },
    onConnect: () => SetConnectionStatus(true),
    onDisconnect: () => SetConnectionStatus(false),
    onData: (payload) => {
        if (!payload.event) return;

        // On intercepte uniquement les événements Raw.Action
        if (payload.event.source === "Raw" && payload.event.type === "Action") {
            const args = payload.data?.arguments;
            if (!args) return;

            // Clé construite depuis les métadonnées Streamerbot (ex: Twitch/Channel.Follow)
            const category = args.triggerCategory || "Unknown";
            const name = args.triggerName || "Unknown";
            const eventKey = `${category}.${name}`;

            if (DEBUG_MODE) {
                console.log(`[Streamerbot Raw Action] Trigger: ${eventKey}`, args);
            }

            updateAlertContainer({
                eventKey: eventKey,
                args: args
            });
        }
    }
});

if (SHOW_TEST_ALERT_ON_LOAD) {
    window.addEventListener("load", () => {
        const mockData = {
            eventKey: "Twitch/Channel.Follow",
            args: {
                user: "DovarkleBG",
                bits: 12300,
                months: 6,
                gifts: 5,
                viewers: 5000
            }
        };
        updateAlertContainer(mockData);
    });
}

window.addEventListener('load', () => {
    const msg = document.querySelector('.message');
    if (msg) makeTextFit(msg, 72, 256);
});