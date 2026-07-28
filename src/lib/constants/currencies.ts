export const CURRENCIES = [
    // Major Global Currencies
    { country: 'United States', name: 'US Dollar', code: 'USD', symbol: '$' },
    { country: 'European Union', name: 'Euro', code: 'EUR', symbol: '€' },
    { country: 'United Kingdom', name: 'British Pound', code: 'GBP', symbol: '£' },
    { country: 'India', name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    { country: 'Japan', name: 'Japanese Yen', code: 'JPY', symbol: '¥' },
    { country: 'China', name: 'Chinese Yuan', code: 'CNY', symbol: '¥' },

    // Americas
    { country: 'Canada', name: 'Canadian Dollar', code: 'CAD', symbol: 'C$' },
    { country: 'Brazil', name: 'Brazilian Real', code: 'BRL', symbol: 'R$' },
    { country: 'Mexico', name: 'Mexican Peso', code: 'MXN', symbol: 'Mex$' },
    { country: 'Argentina', name: 'Argentine Peso', code: 'ARS', symbol: '$' },
    { country: 'Chile', name: 'Chilean Peso', code: 'CLP', symbol: '$' },
    { country: 'Colombia', name: 'Colombian Peso', code: 'COP', symbol: '$' },
    { country: 'Peru', name: 'Peruvian Sol', code: 'PEN', symbol: 'S/' },

    // Europe
    { country: 'Switzerland', name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' },
    { country: 'Sweden', name: 'Swedish Krona', code: 'SEK', symbol: 'kr' },
    { country: 'Norway', name: 'Norwegian Krone', code: 'NOK', symbol: 'kr' },
    { country: 'Denmark', name: 'Danish Krone', code: 'DKK', symbol: 'kr' },
    { country: 'Poland', name: 'Polish Zloty', code: 'PLN', symbol: 'zł' },
    { country: 'Czech Republic', name: 'Czech Koruna', code: 'CZK', symbol: 'Kč' },
    { country: 'Hungary', name: 'Hungarian Forint', code: 'HUF', symbol: 'Ft' },
    { country: 'Romania', name: 'Romanian Leu', code: 'RON', symbol: 'lei' },
    { country: 'Russia', name: 'Russian Ruble', code: 'RUB', symbol: '₽' },
    { country: 'Turkey', name: 'Turkish Lira', code: 'TRY', symbol: '₺' },

    // Asia-Pacific
    { country: 'Australia', name: 'Australian Dollar', code: 'AUD', symbol: 'A$' },
    { country: 'New Zealand', name: 'New Zealand Dollar', code: 'NZD', symbol: 'NZ$' },
    { country: 'Singapore', name: 'Singapore Dollar', code: 'SGD', symbol: 'S$' },
    { country: 'Hong Kong', name: 'Hong Kong Dollar', code: 'HKD', symbol: 'HK$' },
    { country: 'South Korea', name: 'South Korean Won', code: 'KRW', symbol: '₩' },
    { country: 'Taiwan', name: 'New Taiwan Dollar', code: 'TWD', symbol: 'NT$' },
    { country: 'Thailand', name: 'Thai Baht', code: 'THB', symbol: '฿' },
    { country: 'Malaysia', name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM' },
    { country: 'Indonesia', name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp' },
    { country: 'Philippines', name: 'Philippine Peso', code: 'PHP', symbol: '₱' },
    { country: 'Vietnam', name: 'Vietnamese Dong', code: 'VND', symbol: '₫' },
    { country: 'Pakistan', name: 'Pakistani Rupee', code: 'PKR', symbol: '₨' },
    { country: 'Bangladesh', name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳' },
    { country: 'Sri Lanka', name: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs' },

    // Middle East & Africa
    { country: 'United Arab Emirates', name: 'UAE Dirham', code: 'AED', symbol: 'د.إ' },
    { country: 'Saudi Arabia', name: 'Saudi Riyal', code: 'SAR', symbol: '﷼' },
    { country: 'Qatar', name: 'Qatari Riyal', code: 'QAR', symbol: '﷼' },
    { country: 'Kuwait', name: 'Kuwaiti Dinar', code: 'KWD', symbol: 'د.ك' },
    { country: 'Bahrain', name: 'Bahraini Dinar', code: 'BHD', symbol: 'د.ب' },
    { country: 'Oman', name: 'Omani Rial', code: 'OMR', symbol: '﷼' },
    { country: 'Israel', name: 'Israeli Shekel', code: 'ILS', symbol: '₪' },
    { country: 'Egypt', name: 'Egyptian Pound', code: 'EGP', symbol: '£' },
    { country: 'South Africa', name: 'South African Rand', code: 'ZAR', symbol: 'R' },
    { country: 'Nigeria', name: 'Nigerian Naira', code: 'NGN', symbol: '₦' },
    { country: 'Kenya', name: 'Kenyan Shilling', code: 'KES', symbol: 'KSh' },

    // Other Important Currencies
    { country: 'Iraq', name: 'Iraqi Dinar', code: 'IQD', symbol: 'ع.د' },
    { country: 'Jordan', name: 'Jordanian Dinar', code: 'JOD', symbol: 'د.ا' },
    { country: 'Lebanon', name: 'Lebanese Pound', code: 'LBP', symbol: 'ل.ل' },
    { country: 'Morocco', name: 'Moroccan Dirham', code: 'MAD', symbol: 'د.م.' },
    { country: 'Tunisia', name: 'Tunisian Dinar', code: 'TND', symbol: 'د.ت' },
].sort((a, b) => a.code.localeCompare(b.code));
