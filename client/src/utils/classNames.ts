type ClassName = string | [boolean, string] | null | undefined;
/**
 * Формирование составного класса для jsx-элемента с возможностью указать условия
 * @param names
 */
export const classNames = (names: ClassName[]): string =>
  names
    .filter((name) => (Array.isArray(name) ? name[0] : !!name))
    .map((name) => (Array.isArray(name) ? name[1] : name))
    .join(" ");
