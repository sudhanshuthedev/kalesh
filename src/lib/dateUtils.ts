

export const parseDate = (dateInput: any): Date => {
  try {
    if (typeof dateInput === 'object' && dateInput !== null) {

      if (dateInput.iso) {
        return new Date(dateInput.iso);
      } else if (dateInput.timestamp) {
        return new Date(dateInput.timestamp * 1000);
      }
    }

    return new Date(dateInput);
  } catch (error) {
    console.error("Error parsing date:", error, dateInput);
    return new Date();
  }
};

export const formatTimeAgo = (dateInput: any): string => {
  try {
    const date = parseDate(dateInput);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 0) return 'just now';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    const years = Math.floor(days / 365);
    return `${years}y`;
  } catch (error) {
    console.error("Error formatting time ago:", error);
    return "unknown";
  }
};

export const formatLocalDate = (dateInput: any, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const date = parseDate(dateInput);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return date.toLocaleDateString(undefined, options || defaultOptions);
  } catch (error) {
    console.error("Error formatting local date:", error);
    return "unknown date";
  }
};
