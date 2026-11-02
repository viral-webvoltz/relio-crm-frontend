// Saves a Blob through a temporary link; works for authenticated downloads where a plain <a href> would not send the cookie header.
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Reads `filename="x.csv"` from a Content-Disposition header, if the server exposed it.
export const fileNameFrom = (disposition: unknown, fallback: string) =>
  (typeof disposition === 'string' && /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1]) || fallback
