export const randomId = (): string => crypto.randomUUID().replace('-', '').slice(0, 10)
