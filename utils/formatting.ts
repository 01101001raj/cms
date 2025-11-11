export const formatIndianCurrency = (amount: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        ...options,
    }).format(amount);
};

export const formatIndianCurrencyShort = (num: number): string => {
    if (isNaN(num)) return '₹0';
    if (Math.abs(num) >= 10000000) {
        return `₹${(num / 10000000).toFixed(1)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
        return `₹${(num / 100000).toFixed(1)} L`;
    }
    if (Math.abs(num) >= 1000) {
        return `₹${(num / 1000).toFixed(1)} K`;
    }
    return `₹${num.toFixed(0)}`;
};

export const formatIndianNumber = (num?: number): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
}

export const formatDateDDMMYYYY = (date: string | Date): string => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleDateString('en-GB');
    } catch (e) {
        return 'Invalid Date';
    }
};

export const formatDateTimeDDMMYYYY = (date: string | Date): string => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).replace(',', '');
    } catch (e) {
        return 'Invalid Date';
    }
};

const ones: { [key: number]: string } = {
  0: '', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
  10: 'Ten', 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen'
};

const tens: { [key: number]: string } = {
  2: 'Twenty', 3: 'Thirty', 4: 'Forty', 5: 'Fifty', 6: 'Sixty', 7: 'Seventy', 8: 'Eighty', 9: 'Ninety'
};

const groups: string[] = ['', 'Thousand', 'Lakh', 'Crore'];

function numberToWords(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numberToWords(n % 100) : '');
    return '';
}

export function numberToWordsInRupees(num: number): string {
    if (num === 0) return 'Zero Rupees Only';
    
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let words = '';
    let tempNum = rupees;
    let groupIndex = 0;

    if (tempNum === 0) {
        // No rupees part
    } else if (tempNum < 1000) {
        words = numberToWords(tempNum);
    } else {
        words = numberToWords(tempNum % 1000);
        tempNum = Math.floor(tempNum / 1000);
        groupIndex = 1;

        while (tempNum > 0) {
            const chunk = tempNum % 100;
            if (chunk !== 0) {
                words = numberToWords(chunk) + ' ' + groups[groupIndex] + ' ' + words;
            }
            tempNum = Math.floor(tempNum / 100);
            groupIndex++;
        }
    }
    
    let result = `${words.trim()} Rupees`;

    if (paise > 0) {
        result += ` and ${numberToWords(paise)} Paise`;
    }

    return `${result.trim()} Only`;
}