import { format } from "date-fns"

export function formatTime(date: Date): string {
  return format(date, "hh:mm a")
}

