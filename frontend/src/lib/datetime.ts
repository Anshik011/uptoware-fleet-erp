function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalDateTimeString(date: Date = new Date()): string {
  return `${toLocalDateString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function toLocalDateTimeInput(date: Date = new Date()): string {
  return `${toLocalDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
