import { format, formatDistanceToNowStrict } from "date-fns";

export const formatDateTime = (value: string | Date): string => format(new Date(value), "PPp");

export const formatRelative = (value: string | Date): string =>
  `${formatDistanceToNowStrict(new Date(value))} ago`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
