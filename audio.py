from flask import Flask, render_template, request, jsonify
from transformers import pipeline
import torch
import os
import uuid
import time

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load Whisper once (optimized)
pipe = pipeline(
    "automatic-speech-recognition",
    model="openai/whisper-large-v3",
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device=0 if torch.cuda.is_available() else -1,
)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/transcribe", methods=["POST"])
def transcribe():
    start_time = time.time()

    if "audio" not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    task = request.form.get("task", "transcribe")
    audio = request.files["audio"]

    filename = f"{uuid.uuid4()}.wav"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio.save(filepath)

    try:
        result = pipe(
            filepath,
            generate_kwargs={
                "task": task,
                "language": None
            }
        )

        text = result["text"]
        duration = round(time.time() - start_time, 2)

        return jsonify({
            "text": text,
            "time_taken": f"{duration}s",
            "task": task
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


if __name__ == "__main__":
    app.run(debug=True)
