import { toast } from "@/components/ui/toast"

export function notifyError(message: string) {
  toast.add({ title: message, type: "error", priority: "high", timeout: 0 })
}

export function notifySuccess(message: string) {
  toast.add({ title: message, type: "success" })
}

export function notifyInfo(message: string) {
  toast.add({ title: message, type: "info" })
}
