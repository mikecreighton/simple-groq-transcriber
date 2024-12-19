# Simple Groq Transcriber

A simple and efficient audio transcription tool powered by the GroqCloud API, using OpenAI Whisper models.

## Overview

Simple Groq Transcriber is a tool that leverages Groq's API to transcribe audio recordings into text. It provides fast and accurate transcriptions while being easy to use.

## Features

- Fast audio transcription using Whisper models
- Simple web interface with a focus on ease of use (keyboard-driven UX)
- Everything runs in the browser, all data saved to the browser's local storage
- High accuracy transcription results

## Prerequisites

- GroqCloud API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/mikecreighton/simple-groq-transcriber.git
cd simple-groq-transcriber
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run start
```

4. Open the app in your browser:
```bash
http://localhost:3000
```

## Configuration

- You'll be asked to enter your GroqCloud API key, which will be stored in the browser's local storage.
- You can select the Whisper model you want to use.
- You can select the microphone you want to use.

## Usage

- Just hit the spacebar to start recording.
- Hit the spacebar again to stop recording.
- The transcription will be displayed in the "Current Transcription" section.
- The transcription will be automatically copied to your clipboard.
- A history of your transcriptions will be displayed in the "History" section, saved to the browser's local storage.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Groq for providing the AI models
- GPT-o1 for [the initial draft of the code](https://chatgpt.com/share/676489b5-efa0-8012-a490-3351616b7867)
- Cursor (with Claude 3.5 Sonnet) for helping with this README and final touches
