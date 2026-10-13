// ==============================================================================
// EDGEWFORCE - LOCALIZATION & FORMATTING UTILITIES (₦ NGN, +234, Dates)
// ==============================================================================

/**
 * Formats a number as Nigerian Naira (₦).
 */
export function formatMoney(amount) {
  const num = Number(amount || 0);
  return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMoneyShort(amount) {
  const num = Number(amount || 0);
  if (num >= 1000000) {
    return `₦${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `₦${(num / 1000).toFixed(0)}k`;
  }
  return `₦${num.toLocaleString('en-NG')}`;
}

/**
 * Formats a phone number for display and creates WhatsApp link.
 */
export function formatNigerianPhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('0')) {
    clean = '+234' + clean.slice(1);
  }
  return clean;
}

export function getWhatsAppDeepLink(phone, message = '') {
  if (!phone) return '#';
  let clean = phone.replace(/[^\d]/g, '');
  if (clean.startsWith('0')) {
    clean = '234' + clean.slice(1);
  }
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}

export function getGoogleMapsDirLink(lat, lng) {
  if (!lat || !lng) return '#';
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateString).slice(0, 10);
  }
}

export function formatTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatDistance(meters) {
  const m = Number(meters);
  if (isNaN(m) || m < 0) return '0m';
  if (m < 1000) {
    return `${Math.round(m)}m`;
  }
  const km = m / 1000;
  return `${km.toFixed(1)}km`;
}

