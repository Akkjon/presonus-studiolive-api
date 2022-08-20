import { simplifyPathTokens, tokenisePath } from './treeUtil'

export type ValueTransformer = (value: unknown, key?: string[]) => any

export type ValueTransformerLookup = {
    [prefix: string]: ValueTransformer
}

export const doesLookupMatch = (lookup: string, symbolPath: string[]) => {
  const lookupPath = tokenisePath(lookup)
  const lastIdx = Math.min(symbolPath.length, lookupPath.length)

  let lookupIdx = 0
  let symbolIdx = 0

  while (symbolIdx < lastIdx) {
    if ([symbolPath[symbolIdx], '*'].includes(lookupPath[lookupIdx])) {
      // Path matches, or wildcard match
      symbolIdx++
      lookupIdx++
      continue
    } else if (lookupPath[lookupIdx] === '**') {
      lookupIdx++

      // Double wildcard on last token, accept all
      if (lookupIdx === lastIdx) break

      // Find the position of the token after the wildcard
      symbolIdx = symbolPath.indexOf(lookupPath[lookupIdx], lookupIdx)

      // const jumpIdx = symbolPath.indexOf(lookupPath[lookupIdx + 1], lookupIdx + 1)
      // if (jumpIdx === -1) return false
      // symbolIdx = jumpIdx
    } else {
      // Token doesn't match
      return false
    }
  }

  // you reached the end, nice!
  return true
}

/**
 * Value transformers allow values to be processed different depending on their key
 */
export function valueTransform(path: string | string[], value: any, valueTransformers: ValueTransformerLookup): typeof value {
  const symbolPath = simplifyPathTokens(path)

  for (const [lookup, transformer] of Object.entries(valueTransformers)) {
    if (doesLookupMatch(lookup, symbolPath)) {
      value = transformer(value, symbolPath)
      break
    }
  }

  return value
}

export const DEFAULT_TRANSFORMS = {
  integer: {
    boolean(value) {
      if (value === 1) {
        return true
      } else if (value === 0) {
        return false
      }

      throw new Error('Unexpected value')
    }
  },
  buffer: {
    boolean(bytes) {
      if (bytes.equals(new Uint8Array([0x00, 0x00, 0x80, 0x3f]))) {
        return true
      } else if (bytes.equals(new Uint8Array([0x00, 0x00, 0x00, 0x00]))) {
        return false
      }

      throw new Error('Unexpected value')
    }
  }
} as const

export const IGNORE_TRANSFORM = Symbol("Ignore")