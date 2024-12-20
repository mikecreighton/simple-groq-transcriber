// server.js
// A simple express server that serves the static index.html and handles audio transcription via the Groq API

import express from 'express';
import multer from 'multer';
import { createReadStream, unlink } from 'fs';
import path from 'path';
import Groq from 'groq-sdk'; // Ensure "groq-sdk" is installed: `npm install groq-sdk`
import { rename } from 'fs/promises';

const app = express();
const PORT = 3000;

// In-memory cache of current API key if needed (or pass it each time from client)
app.use(express.json());

// Serve the static file
app.use(express.static(path.join(process.cwd())));

// Configure multer to use temporary storage
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp'); // Use system temp directory instead of uploads/
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  const { apiKey, model, fileExtension, prompt } = req.body;
  let audioPath = req.file.path;

  try {
    // Rename the file to have the appropriate extension if it doesn't have one.
    const newPath = audioPath + fileExtension;
    await rename(audioPath, newPath);
    audioPath = newPath;

    // Initialize Groq client and send request
    const groq = new Groq({apiKey: apiKey});
    let options = {
      file: createReadStream(audioPath),
      model: model || 'whisper-large-v3-turbo',
    };
    if (prompt !== "") {
      options.prompt = prompt;
    }
    const transcription = await groq.audio.transcriptions.create(options);
    
    // Send response to client
    res.json(transcription);
  } catch (err) {
    console.error('Error creating transcription:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  } finally {
    // Clean up: Delete the temporary audio file
    unlink(audioPath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
