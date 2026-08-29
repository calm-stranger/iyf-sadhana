"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RefreshCw } from "lucide-react";
import { compressImage } from "@/lib/image";
import { Spinner } from "@/components/ui";

type Mode = "idle" | "camera" | "busy";

/**
 * Registration photo: choose from the gallery OR take a live selfie in-app.
 * The chosen image is compressed and placed on a hidden <input name="photo">
 * so the surrounding <form> submits it normally.
 */
export function PhotoCapture() {
  const [mode, setMode] = useState<Mode>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null); // hidden, name="photo"
  const pickRef = useRef<HTMLInputElement>(null); // hidden gallery picker
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function setPhoto(file: File) {
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) fileRef.current.files = dt.files;
    setPreview(URL.createObjectURL(file));
  }

  async function handlePicked(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMode("busy");
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError("Couldn't use that image. Try another.");
    } finally {
      setMode("idle");
    }
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      // video element mounts with `mode === "camera"`
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Camera not available — allow camera access or choose a photo instead.");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight); // square crop
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size,
    );
    stopCamera();
    setMode("busy");
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (blob) {
      try {
        setPhoto(await compressImage(blob));
      } catch {
        setError("Couldn't save that photo. Try again.");
      }
    }
    setMode("idle");
  }

  function cancelCamera() {
    stopCamera();
    setMode("idle");
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-muted">Photo / selfie</span>

      <input ref={fileRef} type="file" name="photo" accept="image/*" className="hidden" />
      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePicked(e.target.files?.[0])}
      />

      {mode === "camera" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-square w-full scale-x-[-1] object-cover"
          />
          <div className="flex gap-2 bg-surface p-2">
            <button
              type="button"
              onClick={capture}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-fg"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-24 w-24 rounded-xl object-cover" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium"
            >
              <RefreshCw size={15} /> Retake selfie
            </button>
            <button
              type="button"
              onClick={() => pickRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium"
            >
              <ImageUp size={15} /> Choose another
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startCamera}
            disabled={mode === "busy"}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold disabled:opacity-60"
          >
            {mode === "busy" ? <Spinner /> : <Camera size={17} />} Take selfie
          </button>
          <button
            type="button"
            onClick={() => pickRef.current?.click()}
            disabled={mode === "busy"}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold disabled:opacity-60"
          >
            <ImageUp size={17} /> Choose photo
          </button>
        </div>
      )}

      {preview && mode === "idle" ? (
        <p className="text-xs font-medium text-good">Photo added ✓</p>
      ) : null}
      {error ? <p className="text-xs text-warn">{error}</p> : null}
    </div>
  );
}
