// Prośba o pozwolenie na powiadomienia
if ("Notification" in window) {
    Notification.requestPermission();
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
    // Wibracja
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
    // Dźwięk
    document.getElementById("beepSound").play();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function generateStopInputs(machine) {
    const select = document.getElementById(`${machine}_stop_number`);
    const container = document.getElementById(`${machine}_stop_times_container`);
    const count = parseInt(select.value);
    container.innerHTML = "";
    if (count > 0) {
        container.classList.remove("hidden");
        for (let i = 1; i <= count; i++) {
            const label = document.createElement("label");
            label.textContent = `W której minucie stop ${i}:`;
            const input = document.createElement("input");
            input.type = "number";
            input.id = `${machine}_stop_time_${i}`;
            input.placeholder = `np. ${i * 5} min`;
            container.appendChild(label);
            container.appendChild(input);
        }
    } else {
        container.classList.add("hidden");
    }
}

let timers = {
    grob: { remaining: 0, total: 0, stops: [], running: false, paused: false, interval: null, stopStart: null },
    emco: { remaining: 0, total: 0, stops: [], running: false, paused: false, interval: null, stopStart: null }
};

function applySettings() {
    showScreen("screen-timers");
}

function startTimer(machine) {
    const button = document.querySelector(`#${machine}_timer`).parentElement.querySelector("button");
    const timerDisplay = document.getElementById(`${machine}_timer`);
    const stopTimersList = document.getElementById(`${machine}_stop_timers`);
    const stopPrompt = document.getElementById(`${machine}_stop_prompt`);

    if (timers[machine].running && !timers[machine].paused) {
        clearInterval(timers[machine].interval);
        timers[machine].paused = true;
        button.textContent = "Wznów";
        button.classList.remove("stop");
        button.classList.add("start");
        return;
    }
    if (timers[machine].paused) {
        timers[machine].paused = false;
        button.textContent = "Stop";
        button.classList.remove("start");
        button.classList.add("stop");
        runCountdown(machine, timerDisplay, stopTimersList, stopPrompt, button);
        return;
    }

    const progTime = parseInt(document.getElementById(`${machine}_prog`).value) || 0;
    const stopCount = parseInt(document.getElementById(`${machine}_stop_number`).value);
    let stops = [];
    for (let i = 1; i <= stopCount; i++) {
        let min = parseInt(document.getElementById(`${machine}_stop_time_${i}`).value) || 0;
        stops.push(min * 60);
    }

    timers[machine] = { remaining: progTime * 60, total: progTime * 60, stops, running: true, paused: false, interval: null, stopStart: null };
    button.textContent = "Stop";
    button.classList.remove("start");
    button.classList.add("stop");
    runCountdown(machine, timerDisplay, stopTimersList, stopPrompt, button);
}

function runCountdown(machine, timerDisplay, stopTimersList, stopPrompt, button) {
    clearInterval(timers[machine].interval);

    timers[machine].interval = setInterval(() => {
        if (!timers[machine].paused) {
            let min = Math.floor(timers[machine].remaining / 60);
            let sec = timers[machine].remaining % 60;
            timerDisplay.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

            stopTimersList.innerHTML = "";
            let remainingStops = timers[machine].stops.filter(s => s <= timers[machine].remaining);
            remainingStops.forEach((stopTime, index) => {
                let toStop = timers[machine].remaining - stopTime;
                let sMin = Math.floor(toStop / 60);
                let sSec = toStop % 60;
                let div = document.createElement("div");
                div.classList.add("stop-timer");
                div.textContent = `${index === 0 ? "Do najbliższego stopa" : "Do kolejnego stopa"}: ${String(sMin).padStart(2, '0')}:${String(sSec).padStart(2, '0')}`;
                stopTimersList.appendChild(div);
            });

            if (timers[machine].stops.includes(timers[machine].remaining)) {
                timers[machine].paused = true;
                timers[machine].stopStart = Date.now();
                showStopPrompt(machine, stopPrompt, button);
                showNotification(`Stop na ${machine.toUpperCase()}`, "Maszyna osiągnęła stop!");
            }

            if (timers[machine].remaining <= 0) {
                clearInterval(timers[machine].interval);
                timerDisplay.textContent = "KONIEC!";
                stopTimersList.innerHTML = "";
                stopPrompt.classList.add("hidden");
                button.textContent = "Start " + machine.toUpperCase();
                button.classList.remove("stop");
                button.classList.add("start");
                timers[machine].running = false;
                timers[machine].paused = false;
            }

            timers[machine].remaining--;
        }
    }, 1000);
}

function showStopPrompt(machine, stopPrompt, button) {
    stopPrompt.innerHTML = `<p>Czy wciśnięto stopa?</p>
        <button class="yes">Tak</button>
        <button class="no">Nie</button>`;
    stopPrompt.classList.remove("hidden");

    let timeout = setTimeout(() => {
        resumeFromStop(machine, stopPrompt, button, 30);
    }, 30000);

    stopPrompt.querySelector(".yes").onclick = () => {
        let elapsed = Math.floor((Date.now() - timers[machine].stopStart) / 1000);
        clearTimeout(timeout);
        resumeFromStop(machine, stopPrompt, button, elapsed);
    };
}

function resumeFromStop(machine, stopPrompt, button, elapsed) {
    stopPrompt.classList.add("hidden");
    timers[machine].paused = false;
    timers[machine].remaining += elapsed;
    button.textContent = "Stop";
    button.classList.remove("start");
    button.classList.add("stop");
}
