let mediaRecorder;
let recordedChunks = [];
let abortController = null;

/* =========================
   FILE UPLOAD TRANSCRIPTION
========================= */
async function submitAudio() {
    const fileInput = document.getElementById("audioFile");
    const output = document.getElementById("output");
    const submitBtn = document.getElementById("submitBtn");

    if (!fileInput.files.length) {
        alert("Please upload an audio file");
        return;
    }

    const task = document.querySelector('input[name="task"]:checked').value;
    const formData = new FormData();
    formData.append("audio", fileInput.files[0]);
    formData.append("task", task);

    abortController = new AbortController();
    submitBtn.disabled = true;
    output.value = "⏳ Transcribing... Please wait";

    try {
        const response = await fetch("/transcribe", {
            method: "POST",
            body: formData,
            signal: abortController.signal
        });

        const data = await response.json();
        output.value = data.text || data.error || "Unknown error";

    } catch (err) {
        if (err.name === "AbortError") {
            output.value = "❌ Transcription cancelled";
        } else {
            output.value = "⚠️ Server error occurred";
        }
    } finally {
        submitBtn.disabled = false;
    }
}

/* =========================
   CANCEL REQUEST
========================= */
function cancelTranscription() {
    if (abortController) {
        abortController.abort();
    }
}

/* =========================
   AUDIO RECORDING
========================= */
async function startRecording() {
    recordedChunks = [];
    const status = document.getElementById("recordStatus");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstart = () => status.innerText = "🎙 Recording...";
    mediaRecorder.onstop = () => status.innerText = "✅ Recording stopped";

    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "audio/wav" });
        const file = new File([blob], "recorded.wav", { type: "audio/wav" });

        const fileInput = document.getElementById("audioFile");
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
    };
}

/* =========================
   DOWNLOAD TRANSCRIPTION
========================= */
function downloadText() {
    const text = document.getElementById("output").value;
    if (!text.trim()) return;

    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "transcription.txt";
    link.click();
}
