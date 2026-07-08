interface TransporterRule {
  id: number;
  transporter_name: string;
  tracking_prefix: string | null;
  tracking_length_min: number | null;
  tracking_length_max: number | null;
  use_do_reference: boolean;
}

export function detectTransporter(trackingNumber: string, rules: TransporterRule[]) {
  const cleanTracking = trackingNumber.trim();
  const length = cleanTracking.length;

  for (const rule of rules) {
    if (rule.use_do_reference && !rule.tracking_prefix) {
      continue; 
    }

    const isLengthValid = 
      (!rule.tracking_length_min || length >= rule.tracking_length_min) &&
      (!rule.tracking_length_max || length <= rule.tracking_length_max);

    let isPrefixValid = false;
    if (rule.tracking_prefix) {
      const prefixes = rule.tracking_prefix.split(',');
      isPrefixValid = prefixes.some(prefix => cleanTracking.startsWith(prefix.trim()));
    } else if (!rule.tracking_prefix && isLengthValid) {
      isPrefixValid = true;
    }

    if (isLengthValid && isPrefixValid) {
      return {
        success: true,
        transporterId: rule.id,
        transporterName: rule.transporter_name,
        trackingNumber: cleanTracking
      };
    }
  }

  return {
    success: false,
    message: "Ekspedisi tidak dikenali atau format resi salah!",
    trackingNumber: cleanTracking
  };
}