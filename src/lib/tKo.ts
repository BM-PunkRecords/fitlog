import i18nKo from '../data/i18nKo.json'

const map = i18nKo as Record<string, string>

/** Translate catalog English copy to Korean when available. */
export function tKo(text: string | undefined | null): string {
  if (!text) return ''
  return map[text] ?? text
}

export function tKoList(items: string[] | undefined | null): string[] {
  if (!items?.length) return []
  return items.map((item) => tKo(item))
}
