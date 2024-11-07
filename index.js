// Node
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { PassThrough } = require("stream");

// Express
const express = require("express");

// CORS
const cors = require("cors");

// FFMPEG
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// Init Express App
const app = express();

app.use(cors());

const port = 3333;

const FFMPEG_PATH = "/opt/bin/ffmpeg";
const videoPath = "socola.mp4";
const framesDir = path.join(__dirname, "thumbnails");

ffmpeg.setFfmpegPath(ffmpegPath);

app.get("/", async (req, res) => {
  // Generate 5 random timestamps between 0 and 25 seconds
  const timemarks = Array.from({ length: 5 }, () => {
    const seconds = Math.floor(Math.random() * 26); // 0-25 inclusive
    return `00:00:${seconds.toString().padStart(2, "0")}`;
  });

  ffmpeg(videoPath)
    .on("end", () => {
      console.log("Frame extracted successfully");
    })
    .on("error", (err) => {
      console.error(err);
    })
    .seek()
    .takeScreenshots({
      folder: "thumbnails",
      filename: "frame_%02d.jpg",
      timemarks: timemarks,
    });

  return res.json({
    status: 200,
    body: "Hello World",
  });
});

// Generate Timeline Frames Endpoint
app.get("/generate-frames", async (req, res) => {
  const frameCount = 14; // This will be the default value for the timeline zoom
  const duration = 60; // This needs to be dynamic

  const interval = duration / (frameCount + 1);

  // Readable stream
  const frameStream = new PassThrough();

  res.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");

  ffmpeg(videoPath)
    .on("start", () => {
      console.log("Started processing frames...");
    })
    .on("end", () => {
      console.log("Finished processing frame");
      frameStream.end();
    })
    .on("error", (error) => {
      console.error(error);
      res.status(500).end();
    })
    .outputOptions([
      "-vf",
      "fps=1,scale=160:90,setsar=1:1",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
    ])
    .pipe(frameStream);

  frameStream.on("data", (chunk) => {
    res.write(
      "--frame\r\n" +
        "Content-Type: image/jpeg\r\n" +
        `Content-Length: ${chunk.length}\r\n\r\n`
    );
    res.write(chunk);
    res.write("\r\n");
  });

  frameStream.on("end", () => {
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`);
});
