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
const ffprobe = require("ffprobe-static");

// Init Express App
const app = express();

app.use(cors());

const port = 3333;

const FFMPEG_PATH = "/opt/bin/ffmpeg";
const videoPath = "socola.mp4";
const framesDir = path.join(__dirname, "thumbnails");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobe.path);

// Generate Timeline Frames Endpoint
app.get("/generate-frames", async (req, res) => {
  const frameCount = 14; // This will be the default value for the timeline zoom

  // Readable stream
  const frameStream = new PassThrough();

  ffmpeg.ffprobe(videoPath, (err, metadata) => {
    if (err) {
      console.error("[FFPROBE]", err);
      return res.status(500).send("Could not retrieve video metadata", err);
    }

    const duration = metadata.format.duration;
    console.log(duration);
    const interval = duration / frameCount;

    console.log(interval);

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
        `fps=1/${interval},scale=160:90,setsar=1:1`,
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
});

app.listen(port, () => {
  console.log(`Server running at localhost:${port}`);
});
