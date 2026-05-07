// 最大同時実行数を制限するシンプルな Promise キュー
export function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0
  const queue: Array<() => void> = []

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++
        fn().then(resolve, reject).finally(() => {
          active--
          queue.shift()?.()
        })
      }
      active < maxConcurrent ? run() : queue.push(run)
    })
  }
}
