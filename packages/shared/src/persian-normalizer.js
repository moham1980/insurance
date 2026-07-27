const ARABIC_TO_PERSIAN = {
    'ي': 'ی', 'ك': 'ک', 'ة': 'ه', 'ى': 'ی', 'ؤ': 'و', 'إ': 'ا', 'أ': 'ا', 'آ': 'آ',
};
const ARABIC_INDIC_TO_PERSIAN = {
    '٠': '۰', '١': '۱', '٢': '۲', '٣': '۳', '٤': '۴',
    '٥': '۵', '٦': '۶', '٧': '۷', '٨': '۸', '٩': '۹',
};
const PERSIAN_TO_LATIN_DIGITS = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};
const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
export class PersianNormalizer {
    static normalize(text) {
        if (!text)
            return text;
        let result = text;
        for (const [arabic, persian] of Object.entries(ARABIC_TO_PERSIAN)) {
            result = result.split(arabic).join(persian);
        }
        for (const [arabic, persian] of Object.entries(ARABIC_INDIC_TO_PERSIAN)) {
            result = result.split(arabic).join(persian);
        }
        result = result.replace(DIACRITICS, '');
        result = result.replace(/\u200c+/g, '\u200c');
        result = result.replace(/\s+/g, ' ').trim();
        return result;
    }
    static normalizeToLatin(text) {
        const normalized = this.normalize(text);
        let result = normalized;
        for (const [persian, latin] of Object.entries(PERSIAN_TO_LATIN_DIGITS)) {
            result = result.split(persian).join(latin);
        }
        return result;
    }
    static normalizePhone(phone) {
        if (!phone)
            return phone;
        let result = this.normalizeToLatin(phone);
        result = result.replace(/[\s\-()]/g, '');
        if (result.startsWith('0098'))
            result = '+98' + result.slice(4);
        if (result.startsWith('98') && result.length === 12)
            result = '+98' + result.slice(2);
        if (result.startsWith('09'))
            result = '+98' + result.slice(1);
        return result;
    }
    static normalizeNationalId(nationalId) {
        if (!nationalId)
            return nationalId;
        const result = this.normalizeToLatin(nationalId).replace(/\s/g, '');
        return result;
    }
    static fuzzyEquals(a, b) {
        return this.normalize(a) === this.normalize(b);
    }
    static fuzzyEqualsLatin(a, b) {
        return this.normalizeToLatin(a) === this.normalizeToLatin(b);
    }
}
//# sourceMappingURL=persian-normalizer.js.map
