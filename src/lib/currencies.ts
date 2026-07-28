export const WORLD_CURRENCIES = (() => {
    try {
        return Intl.supportedValuesOf('currency').map(code => {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: code,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            const symbol = formatter.formatToParts(0).find(p => p.type === 'currency')?.value || code;
            return { code, symbol };
        });
    } catch (e) {
        // Fallback for environments lacking full Intl support
        return [
            { code: 'USD', symbol: '$' },
            { code: 'EUR', symbol: '€' },
            { code: 'GBP', symbol: '£' },
            { code: 'INR', symbol: '₹' },
            { code: 'CAD', symbol: 'CA$' },
            { code: 'AUD', symbol: 'A$' },
        ];
    }
})();

export const getCurrencySymbol = (code: string) => {
    if (!code) return '$';
    const found = WORLD_CURRENCIES.find(c => c.code === code);
    return found ? found.symbol : code;
};
