const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Tell fluent-ffmpeg where it can find FFmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const generateThumbnail = (videoSource, timestamp) => {
  ffmpeg(videoSource)
    .outputOptions([
      `-ss ${timestamp}`, // Seek to 1 second into the video for the thumbnail
      '-vframes 1', // Capture one frame
      '-q:v 5', // Set output quality (lower is better)
      '-vf scale=300:-1' // Scale while maintaining aspect ratio
    ])
    .save('./output/thumbnail.jpg')
    .on('end', () => {
      console.log('Thumbnail is generated!');
    })
    .on('error', (err) => {
      console.error(`Error generating thumbnail: ${err.message}`);
    });
};

const compressVideo = (videoSource) => {
  ffmpeg(videoSource)
    .outputOptions([
      '-c:v libx264', // Video codec
      '-preset veryfast', // Fast encoding with reasonable quality and file size
      '-movflags +faststart', // Optimize for web streaming
      `-crf 27`, // Constant Rate Factor for quality
      '-tag:v avc1' // Tag for QuickTime compatibility
    ])
    .on('end', () => {
      console.log(`Compression complete: video.mp4`);
    })
    .on('error', (err) => {
      console.error(`Error during compression: ${err.message}`);
    })
    .save('./output/compress_video.mp4');
};

const createPreviewClip = (videoSource, startTime, duration) => {
  ffmpeg(videoSource)
    .setStartTime(startTime) // Start time for the preview clip
    .duration(duration) // Duration of the preview clip
    .outputOptions([
      '-c:v libx264', // Video codec
      '-preset veryfast', // Fast encoding with reasonable quality and file size
      '-movflags +faststart', // Optimize for web streaming
      `-crf 27`, // Constant Rate Factor for quality
      '-tag:v avc1' // Tag for QuickTime compatibility
    ])
    .save('./output/preview_video.mp4')
    .on('end', () => {
      console.log('Preview clip is generated!');
    })
    .on('error', (err) => {
      console.error(`Error creating preview clip: ${err.message}`);
    });
};

const createMasterPlaylist = () => {
  const masterPlaylistContent = `
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=300000,RESOLUTION=640x360
360p.m3u8
`.trim();

  fs.writeFileSync(path.join('./output/hls', 'master.m3u8'), masterPlaylistContent);
};

const createHLS = (videoSource) => {
  for (const width of [360, 720]) {
    ffmpeg(videoSource)
      .outputOptions([
        '-c:v libx264', // Video codec
        '-preset veryfast', // Fast encoding with reasonable quality and file size
        '-movflags +faststart', // Optimize for web streaming
        '-crf 27', // Constant Rate Factor for quality
        '-tag:v avc1', // Tag for QuickTime compatibility

        '-f hls', // Output format
        '-hls_time 10', // Segment duration
        '-hls_list_size 0', // Include all segments in playlist
        '-hls_flags independent_segments' // Each segment can be decoded independently
      ])
      .output(path.join('./output/hls', `${width}p.m3u8`))
      .videoFilter(`scale=${width}:-2`) // Scale width and maintain aspect ratio
      .on('progress', () => {
        console.log(`An HLS ${width}p segment has been generated successfully!`);
      })
      .on('end', () => {
        if (width === 720) {
          // Create the master manifest that includes the playlists details
          createMasterPlaylist();
        }

        console.log(`All HLS segments for ${width}p has been generated successfully!`);
      })
      .on('error', (err) => {
        console.log(`Error: ${err.message}`);
      })
      .run();
  }
};

module.exports = {
  compressVideo,
  generateThumbnail,
  createPreviewClip,
  createHLS
};
