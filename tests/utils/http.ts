export function getSetCookies(res: Response): string[] {
  const out: string[] = []
  // Some runtimes expose multiple Set-Cookie headers via iterator
  for (const [k, v] of (res.headers as any)) {
    if (String(k).toLowerCase() === 'set-cookie') out.push(v as string)
  }
  // Fallback for environments that collapse headers
  const single = res.headers.get('set-cookie')
  if (single && out.length === 0) out.push(single)
  return out
}

