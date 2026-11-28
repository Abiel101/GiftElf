import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type InviteScannerProps = {
  onScan: (code: string) => void
  onClose: () => void
}

function inviteCodeFromQr(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    const code = url.searchParams.get("join")
    return code && /^[0-9a-f]{32}$/i.test(code) ? code.toUpperCase() : null
  } catch {
    return null
  }
}

export function InviteScanner({ onScan, onClose }: InviteScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState("Starting camera...")

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | undefined
    let frame = 0
    let lastScan = 0
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d", { willReadFrequently: true })

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !video || !context) {
          throw new Error(
            "Camera scanning is unavailable. Use HTTPS and a supported browser, or enter the code manually."
          )
        }
        const { default: jsQR } = await import("jsqr")
        if (cancelled) return
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        if (cancelled) return
        setMessage("Point your camera at a family invite QR code.")

        function scan(time: number) {
          if (cancelled || !video || !context) return
          if (time - lastScan >= 150 && video.videoWidth && video.videoHeight) {
            lastScan = time
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            context.drawImage(video, 0, 0, canvas.width, canvas.height)
            const image = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            )
            const result = jsQR(image.data, image.width, image.height)
            if (result) {
              const code = inviteCodeFromQr(result.data)
              if (code) {
                onScan(code)
                return
              }
              setMessage(
                "This is not a family invite QR code. Try another code."
              )
            }
          }
          frame = requestAnimationFrame(scan)
        }
        frame = requestAnimationFrame(scan)
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop())
        if (!cancelled) {
          setMessage(
            error instanceof Error && error.name !== "NotAllowedError"
              ? error.message
              : "Camera access was denied. Allow camera access or enter the code manually."
          )
        }
      }
    }

    void start()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [onScan])

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <video
        aria-label="Camera for scanning a family invite"
        autoPlay
        className="w-full rounded-lg bg-black"
        muted
        playsInline
        ref={videoRef}
      />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {message}
      </p>
      <Button onClick={onClose} type="button" variant="outline">
        Close camera
      </Button>
    </div>
  )
}
