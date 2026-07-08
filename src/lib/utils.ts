export const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateShort = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const generateSessionCode = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SES-${date}-${random}`;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'RUNNING':
      return 'emerald';
    case 'CLOSED':
      return 'amber';
    case 'RECONCILED':
      return 'blue';
    case 'DONE':
      return 'green';
    default:
      return 'gray';
  }
};

export const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    RUNNING: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    CLOSED: 'bg-amber-50 text-amber-600 border-amber-200',
    RECONCILED: 'bg-blue-50 text-blue-600 border-blue-200',
    DONE: 'bg-green-50 text-green-600 border-green-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
};