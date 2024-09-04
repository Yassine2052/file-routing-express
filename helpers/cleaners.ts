import { LEADING_BACKSLASH_REGEX } from "../constants/regex";

export function removeLeadingBackSlashesFromName(value: string) {
    return value.replace(LEADING_BACKSLASH_REGEX, "");
}