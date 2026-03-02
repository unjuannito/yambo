/**
 * Returns a date 6 months ago from now, formatted as ISO string for API calls.
 */
export function getSixMonthsAgoISO(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString();
}

/**
 * Returns a Date object set to 6 months ago from now.
 */
export function getSixMonthsAgo(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date;
}

/**
 * Checks if a date string is within the last 6 months.
 */
export function isWithinSixMonths(dateStr: string): boolean {
    const date = new Date(dateStr);
    const sixMonthsAgo = getSixMonthsAgo();
    return date >= sixMonthsAgo;
}
