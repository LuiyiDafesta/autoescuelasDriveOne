export const money = (n: number | null | undefined): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n || 0);
};

export const escapeHtml = (s: any): string => {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
};

export const cleanPhone = (phone: string): string => {
  return String(phone || '').replace(/\D/g, '');
};

export const intlPhone = (phone: string): string => {
  const digits = cleanPhone(phone);
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return '54' + digits.slice(1);
  return '549' + digits.replace(/^15/, '');
};
