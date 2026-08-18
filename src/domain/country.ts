/**
 * A country on the world map, identified by its Natural Earth id
 * (ISO 3166-1 numeric) and displayed by name.
 */
export type Country = {
  readonly id: string
  readonly name: string
}
