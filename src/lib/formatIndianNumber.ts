/**
 * Indian numbering system formatter utility
 * 1000 → 1,000  |  100000 → 1,00,000  |  10000000 → 1,00,00,000
 */

/** Strip commas from a string to get raw digits */
export function stripCommas(value: string): string {
    return value.replace(/,/g, '');
}

/**
 * Format a plain number string using Indian number system.
 * e.g. "600000" → "6,00,000"
 */
export function formatIndian(value: string | number): string {
    const raw = String(value).replace(/,/g, '').trim();
    if (!raw || isNaN(Number(raw)) || raw === '') return raw;

    const [intPart, decPart] = raw.split('.');
    if (!intPart) return raw;

    // Indian format: last 3 digits fixed, then groups of 2 from the right
    if (intPart.length <= 3) {
        return decPart !== undefined ? `${intPart}.${decPart}` : intPart;
    }

    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, intPart.length - 3);
    // Add commas every 2 digits in the rest part
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

    const formatted = restFormatted + ',' + lastThree;
    return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/** Return the raw numeric value (without commas) as a number */
export function parseIndian(formatted: string): number {
    return Number(stripCommas(formatted));
}

/**
 * Call this in onBlur with the CURRENT STATE VALUE (not event.target.value).
 * Applies Indian comma formatting and calls setter.
 * Usage: onBlur={() => blurFormatIndian(currentValue, setValue)}
 */
export function blurFormatIndian(currentValue: string, setter: (val: string) => void) {
    const raw = currentValue.replace(/,/g, '').trim();
    if (!raw || raw === '') {
        setter('');
        return;
    }
    if (isNaN(Number(raw))) {
        setter(raw); // leave as-is if not a number
        return;
    }
    setter(formatIndian(raw));
}

/**
 * Before submitting to backend: strip commas to get plain numeric string.
 */
export function toNumericString(formatted: string): string {
    return stripCommas(formatted);
}
