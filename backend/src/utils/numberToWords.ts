// Indian Number to Words converter (Crores, Lakhs, Thousands, Hundreds)

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      str += ones[n] + ' ';
    } else {
      str += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        str += ones[n % 10] + ' ';
      }
    }
  }
  return str.trim();
}

export function numberToIndianWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';

  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let parts: string[] = [];

  // Crores (10,000,000)
  const crores = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  // Lakhs (100,000)
  const lakhs = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  // Thousands (1,000)
  const thousands = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  // Hundreds & Below
  const hundreds = remainder;

  if (crores > 0) {
    parts.push(convertBelowThousand(crores) + ' Crore');
  }
  if (lakhs > 0) {
    parts.push(convertBelowThousand(lakhs) + ' Lakh');
  }
  if (thousands > 0) {
    parts.push(convertBelowThousand(thousands) + ' Thousand');
  }
  if (hundreds > 0) {
    parts.push(convertBelowThousand(hundreds));
  }

  let result = 'Rupees ' + parts.join(' ');

  if (paise > 0) {
    result += ' and ' + convertBelowThousand(paise) + ' Paise';
  }

  return (result + ' Only').replace(/\s+/g, ' ');
}

