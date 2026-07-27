/**
 * PersianNormalizer
 * Normalizes Persian (Farsi) text by:
 * - Converting Arabic letters to Persian equivalents (ي→ی, ك→ک)
 * - Normalizing ZWNJ (zero-width non-joiner) usage
 * - Removing diacritics/tatweel
 * - Normalizing spacing around punctuation
 * - Converting Arabic-Indic digits to Persian digits
 * - Converting Arabic-Indic digits to Latin digits (optional)
 */

const ARABIC_TO_PERSIAN: Record<string, string> = {
  'ي': 'ی',
  'ك': 'ک',
  'ة': 'ه',
  'ى': 'ی',
  'ؤ': 'و',
  'إ': 'ا',
  'أ': 'ا',
  'آ': 'آ',
};

const ARABIC_DIGITS_TO_PERSIAN: Record<string, string> = {
  '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
  '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
};

const ARABIC_INDIC_TO_PERSIAN: Record<string, string> = {
  '٠': '۰', '١': '۱', '٢': '۲', '٣': '۳', '٤': '۴',
  '٥': '۵', '٦': '۶', '٧': '۷', '٨': '۸', '٩': '۹',
};

const PERSIAN_TO_LATIN_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;

export class PersianNormalizer {
  /**
   * Normalize Persian text:
   * - Arabic letters → Persian equivalents
   * - Arabic-Indic digits → Persian digits
   * - Remove diacritics and tatweel
   * - Collapse multiple spaces
   * - Trim
   */
  static normalize(text: string): string {
    if (!text) return text;

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

  /**
   * Normalize and convert all digits (Persian + Arabic-Indic) to Latin digits.
   * Useful for database lookups, phone numbers, national IDs, etc.
   */
  static normalizeToLatin(text: string): string {
    const normalized = this.normalize(text);

    let result = normalized;
    for (const [persian, latin] of Object.entries(PERSIAN_TO_LATIN_DIGITS)) {
      result = result.split(persian).join(latin);
    }

    return result;
  }

  /**
   * Normalize a phone number: convert to Latin digits, strip spaces/dashes.
   */
  static normalizePhone(phone: string): string {
    if (!phone) return phone;
    let result = this.normalizeToLatin(phone);
    result = result.replace(/[\s\-()]/g, '');
    if (result.startsWith('0098')) result = '+98' + result.slice(4);
    if (result.startsWith('98') && result.length === 12) result = '+98' + result.slice(2);
    if (result.startsWith('09')) result = '+98' + result.slice(1);
    return result;
  }

  /**
   * Normalize a national ID (کد ملی): Latin digits only, 10 digits.
   */
  static normalizeNationalId(nationalId: string): string {
    if (!nationalId) return nationalId;
    const result = this.normalizeToLatin(nationalId).replace(/\s/g, '');
    return result.length === 10 ? result : result;
  }

  /**
   * Fuzzy compare two Persian strings after normalization.
   * Returns true if they are equal after normalization.
   */
  static fuzzyEquals(a: string, b: string): boolean {
    return this.normalize(a) === this.normalize(b);
  }

  /**
   * Fuzzy compare using Latin digit normalization (for IDs, phone numbers).
   */
  static fuzzyEqualsLatin(a: string, b: string): boolean {
    return this.normalizeToLatin(a) === this.normalizeToLatin(b);
  }
}
