import { match, type MatchFunction } from "path-to-regexp";

type PathMapValue<T> = {
  path: string
  matcher: MatchFunction<Record<string, any>>,
  objects: T[]
}

type PathMapMatched<T> = {
  params: Record<string, any>
  object: T
}

export class PathMap<T> extends Map<number, Map<string, PathMapValue<T>>> {
  matchByPrefix?: PathMap<T>
  matchByStar = new Map<string, PathMapValue<T>>
  splitter = '/'
  ranking = 0
  rankingMap = new Map<T, number>()

  constructor(createPrefixMap = true) {
    super()
    if (createPrefixMap) {
      this.matchByPrefix = new PathMap<T>(false)
    }
  }

  cleanPath(path: string) {
    if (!path.startsWith(this.splitter)) {
      return `/${path}`
    }
    return path
  }

  getSplittedPath(path: string) {
    path = this.cleanPath(path)
    return path.split(this.splitter).filter(Boolean).map(e => e.trim())
  }

  append(path: string, ...obj: T[]) {
    for (const o of obj) {
      this.setRanking(o)
    }

    path = this.cleanPath(path)
    if (path.includes('*') || path.includes('{')) {
      this.matchByStar.set(path, { path, matcher: match(path), objects: obj })
      return;
    }
    const segments = this.getSplittedPath(path).length
    const current = this.get(segments) ?? new Map<string, PathMapValue<T>>()
    const currentMapArray = current.get(path) ?? {
      path,
      matcher: match(path),
      objects: []
    }
    currentMapArray.objects.push(...obj)
    current.set(path, currentMapArray)
    this.set(segments, current)
  }

  appendUse(path: string, ...obj: T[]) {
    for (const o of obj) {
      this.setRanking(o)
    }
    this.matchByPrefix?.append(path, ...obj)
  }

  splitBy(splitter: string) {
    this.splitter = splitter
    if (this.matchByPrefix) {
      this.matchByPrefix.splitter = splitter
    }
  }

  setRanking(obj: T) {
    const ranking = this.ranking++
    this.rankingMap.set(obj, ranking)
  }

  /**
   * Allow matching by:
   * - /path/a/b/c
   * - path/a/b/c
   * 
   * to fetch the same arrays
   */
  getAllMatching(path: string): PathMapMatched<T>[] {
    path = this.cleanPath(path)
    const splitted = this.getSplittedPath(path)

    const matches: PathMapMatched<T>[] = []

    let toJoin: string[] = []
    if (this.matchByPrefix) {
      for (const path of splitted) {
        toJoin.push(path)
        const joined = toJoin.join(this.splitter)
        matches.push(...this.matchByPrefix.getAllMatching(joined))
      }
    }

    for (const value of this.matchByStar.values()) {
      const matched = value.matcher(path)
      if (!matched) continue
      matches.push(...value.objects.map(e => ({ params: { ...matched.params }, object: e })))
    }

    const segments = splitted.length
    const map = this.get(segments)
    if (map) {
      for (const value of map.values()) {
        const matched = value.matcher(path)
        if (!matched) continue
        matches.push(...value.objects.map(e => ({ params: { ...matched.params }, object: e })))
      }
    }

    return matches.toSorted((a, b) => {
      const aRanking = this.rankingMap.get(a.object)
      const bRanking = this.rankingMap.get(b.object)
      if (aRanking === undefined || bRanking === undefined) {
        return 0
      }
      return aRanking - bRanking
    })
  }
}