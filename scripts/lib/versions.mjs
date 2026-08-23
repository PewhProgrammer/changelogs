export function compareVersionsDesc(a, b) {
  const aParts = a.split('.')
  const bParts = b.split('.')
  const length = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < length; i += 1) {
    const aPart = aParts[i] ?? '0'
    const bPart = bParts[i] ?? '0'
    const aNumber = Number(aPart)
    const bNumber = Number(bPart)
    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
      const compared = bPart.localeCompare(aPart)
      if (compared !== 0) return compared
    } else if (aNumber !== bNumber) {
      return bNumber - aNumber
    }
  }
  return 0
}
