#!/usr/bin/env python3
"""
Extract Desert Golfing hole screenshots from YouTube gameplay videos.
Uses yt-dlp to get stream URLs and OpenCV to extract frames.
"""

import subprocess
import cv2
import numpy as np
import os
import sys
import json
import re
import time

BASE_DIR = "/mnt/c/Users/augus/projectss/desert-golfing-level-design/reference/desert-golfing-holes"

VIDEOS = [
    ("COdYdiM7hvI", "Holes 1-101", 1, 101),
    ("BISbVrJBMPM", "Holes 102-223", 102, 223),
    ("A5_YmItN6zg", "Holes 224-400", 224, 400),
    ("FExyOd4ewo0", "Holes 401-501", 401, 501),
    ("--VL_kaiuU4", "Holes 502-601", 502, 601),
    ("LBaLewnx3hA", "Holes 602-701", 602, 701),
    ("bxSfI3andNA", "Holes 702-802", 702, 802),
    ("dzfcGiYXkQo", "Holes 803-901", 803, 901),
    ("uCIbzMMPRz0", "Holes 902-1001", 902, 1001),
    ("yRTanhW8_l4", "Holes 1002-1101", 1002, 1101),
    ("H0KSMd9wdVY", "Holes 1102-1201", 1102, 1201),
    ("RFQ4hliOdnU", "Holes 1202-1300", 1202, 1300),
    ("rD8jy8xm1S0", "Holes 1301-1401", 1301, 1401),
    ("h3VGeDgMu9Y", "Holes 1402-1501", 1402, 1501),
    ("bkbrqnVXz24", "Holes 1502-1601", 1502, 1601),
    ("KL9DiLL1J6k", "Holes 1602-1701", 1602, 1701),
    ("aZ95PvuNUuA", "Holes 1702-1801", 1702, 1801),
    ("DwvaAn362Mc", "Holes 1802-1901", 1802, 1901),
    ("XTLQ1AAudLs", "Holes 1902-2001", 1902, 2001),
    ("kFYI9ny7_0A", "Holes 2002-2101", 2002, 2101),
    ("Aub4FuuHFag", "Holes 2102-2222", 2102, 2222),
    ("wfDUhUBuGlw", "Holes 2223-2301", 2223, 2301),
    ("rRvC4p92FOg", "Holes 2302-2401", 2302, 2401),
    ("_qQQD2YCAL0", "Holes 2402-2501", 2402, 2501),
    ("pc3tJbKR1SM", "Holes 2502-2601", 2502, 2601),
    ("FeQdaqgGbQg", "Holes 2602-2701", 2602, 2701),
    ("KmGBMgs6Auk", "Holes 2702-2801", 2702, 2801),
    ("sn5LoKcaf0Y", "Holes 2802-2901", 2802, 2901),
    ("hqPwbOsNeD0", "Holes 2902-3001", 2902, 3001),
    ("nwZtwtl1-lQ", "Holes 3002-3101", 3002, 3101),
    ("l7nADSh2cjU", "Holes 3102-3200", 3102, 3200),
    ("gD1RMJWjQWk", "Holes 3201-3300", 3201, 3300),
    ("_PnS_QDVapU", "Holes 3301-3400", 3301, 3400),
    ("ihdiOtpNI7g", "Holes 3401-3500", 3401, 3500),
    ("vlrXvibbzeU", "Holes 3501-3600", 3501, 3600),
    ("cznGX_h6DkI", "Holes 3601-3700", 3601, 3700),
    ("F6fvyLbBCsc", "Holes 3701-3800", 3701, 3800),
    ("XCBbBfWXYUQ", "Holes 3801-3900", 3801, 3900),
    ("jPtU2bnL8SY", "Holes 3901-4000", 3901, 4000),
    ("llCXQbIxNNA", "Holes 4001-4100", 4001, 4100),
    ("Zq4h-SiGSUE", "Holes 4101-4200", 4101, 4200),
    ("8HejMWwNbTA", "Holes 4201-4300", 4201, 4300),
    ("ykzcq7TyNUU", "Holes 4301-4400", 4301, 4400),
    ("afZrlMeb-YU", "Holes 4401-4500", 4401, 4500),
    ("p8HI5JQAZlU", "Holes 4501-4600", 4501, 4600),
    ("hoZY7SVjWmQ", "Holes 4601-4700", 4601, 4700),
    ("GhCSodgW8Cs", "Holes 4701-4800", 4701, 4800),
    ("zpspGH1osV4", "Holes 4801-4900", 4801, 4900),
    ("oW0S0wHgWu8", "Holes 4901-5000", 4901, 5000),
    ("UTpWiCkhLG0", "Holes 5001-5100", 5001, 5100),
    ("xiXU5b8PW98", "Holes 5101-5200", 5101, 5200),
    ("SGm5rQEPlUs", "Holes 5201-5300", 5201, 5300),
    ("DHch3qjIeLE", "Holes 5301-5400", 5301, 5400),
    ("zgsEgBGRHfY", "Holes 5401-5500", 5401, 5500),
    ("u9ri2ysmf-0", "Holes 5501-5600", 5501, 5600),
    ("QMgRzkUI4VE", "Holes 5601-5700", 5601, 5700),
    ("WRD9I4KC69I", "Holes 5701-5800", 5701, 5800),
    ("nq9OoIEtcZU", "Holes 5801-5900", 5801, 5900),
    ("tItpG4BQv1U", "Holes 5901-6000", 5901, 6000),
    ("uaRbmsj1xTo", "Holes 6001-6100", 6001, 6100),
    ("Olg1_JCgmhI", "Holes 6101-6200", 6101, 6200),
    ("LOe6Yk0JZig", "Holes 6201-6300", 6201, 6300),
    ("9K4smppoQp4", "Holes 6301-6400", 6301, 6400),
    ("2W9wO9LwGWM", "Holes 6401-6500", 6401, 6500),
]


def get_stream_url(video_id):
    """Get 720p stream URL from yt-dlp. Falls back to 360p if needed."""
    for fmt in ["298", "18"]:
        try:
            result = subprocess.run(
                ["yt-dlp", "-f", fmt, "--get-url",
                 f"https://www.youtube.com/watch?v={video_id}"],
                capture_output=True, text=True, timeout=30
            )
            url = result.stdout.strip().split('\n')[-1]
            if url.startswith("http"):
                return url, fmt
        except Exception:
            continue
    return None, None


def get_video_duration(video_id):
    """Get video duration in seconds."""
    try:
        result = subprocess.run(
            ["yt-dlp", "--print", "%(duration)s",
             f"https://www.youtube.com/watch?v={video_id}"],
            capture_output=True, text=True, timeout=30
        )
        return float(result.stdout.strip())
    except Exception:
        return None


def is_stable_frame(frame, prev_frame, threshold=15.0):
    """Check if frame is stable (not mid-transition) by comparing to previous."""
    if prev_frame is None:
        return True
    diff = cv2.absdiff(frame, prev_frame)
    mean_diff = np.mean(diff)
    return mean_diff < threshold


def has_terrain(frame):
    """Basic check that frame has actual gameplay (not a loading/blank screen)."""
    # Check if there's meaningful variation in the lower half (terrain area)
    lower_half = frame[frame.shape[0]//2:, :]
    std = np.std(lower_half)
    return std > 15  # Very uniform frames are likely blank/loading


def extract_frames(video_id, title, start_hole, end_hole, video_idx):
    """Extract ~50 frames from a video, saving as hole screenshots."""
    num_holes = end_hole - start_hole + 1
    target_frames = min(50, num_holes)

    # Create output directory
    dir_name = f"video-{video_idx:02d}-holes-{start_hole:04d}-{end_hole:04d}"
    out_dir = os.path.join(BASE_DIR, dir_name)
    os.makedirs(out_dir, exist_ok=True)

    # Check if already processed
    existing = [f for f in os.listdir(out_dir) if f.endswith('.png')]
    if len(existing) >= target_frames:
        print(f"  Skipping {title} - already have {len(existing)} frames")
        return len(existing)

    # Get stream URL
    print(f"  Getting stream URL...")
    url, fmt = get_stream_url(video_id)
    if not url:
        print(f"  ERROR: Could not get stream URL for {video_id}")
        return 0

    res = "720p" if fmt == "298" else "360p"
    print(f"  Got {res} stream URL")

    # Open video
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        print(f"  ERROR: Could not open video stream")
        return 0

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = total_frames / fps if fps > 0 else 0

    print(f"  Video: {duration:.0f}s, {fps:.0f}fps, {total_frames:.0f} frames")

    # Calculate seek positions - evenly spaced, skipping first/last 5%
    margin = int(total_frames * 0.03)  # Skip 3% at start/end
    usable_frames = total_frames - 2 * margin
    step = usable_frames / target_frames

    saved = 0
    prev_frame = None

    for i in range(target_frames):
        target_pos = int(margin + i * step)

        # Estimate hole number (linear interpolation)
        progress = (target_pos - margin) / usable_frames
        est_hole = int(start_hole + progress * (end_hole - start_hole))

        # Check if we already have this hole
        filename = f"hole-{est_hole:05d}.png"
        filepath = os.path.join(out_dir, filename)
        if os.path.exists(filepath):
            continue

        # Seek to position
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_pos)
        ret, frame = cap.read()
        if not ret:
            print(f"  Could not read frame at position {target_pos}")
            continue

        # Quality checks
        if not has_terrain(frame):
            # Try a few frames ahead
            for offset in [30, 60, 90]:
                cap.set(cv2.CAP_PROP_POS_FRAMES, target_pos + offset)
                ret, frame = cap.read()
                if ret and has_terrain(frame):
                    break
            else:
                continue

        # Save frame
        cv2.imwrite(filepath, frame)
        saved += 1
        prev_frame = frame

        if saved % 10 == 0:
            print(f"  Saved {saved}/{target_frames} frames...")

    cap.release()
    print(f"  Done: saved {saved} frames to {dir_name}/")
    return saved


def main():
    start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end_idx = int(sys.argv[2]) if len(sys.argv) > 2 else len(VIDEOS)

    os.makedirs(BASE_DIR, exist_ok=True)

    total_saved = 0
    for idx in range(start_idx, min(end_idx, len(VIDEOS))):
        video_id, title, start_hole, end_hole = VIDEOS[idx]
        print(f"\n[{idx+1}/{len(VIDEOS)}] Processing {title} (video {video_id})")

        try:
            saved = extract_frames(video_id, title, start_hole, end_hole, idx + 1)
            total_saved += saved
        except Exception as e:
            print(f"  ERROR: {e}")
            continue

    print(f"\n=== Total: {total_saved} frames saved ===")


if __name__ == "__main__":
    main()
