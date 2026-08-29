import type {
  ImportedWeDynamicText,
  ImportedWeDynamicTextPart,
} from './wallpaperEngineImportedScene';

const padTwo = (value: number): string => String(value).padStart(2, '0');

const separateDigits = (value: string, separator: string): string => (
  separator ? [...value].join(separator) : value
);

const numberPartValue = (
  part: Extract<ImportedWeDynamicTextPart, { kind: 'number' }>,
  date: Date,
): string => {
  let numericValue: number;
  if (part.field === 'dayOfMonth') numericValue = date.getDate();
  else if (part.field === 'month') numericValue = date.getMonth() + 1;
  else numericValue = date.getFullYear();
  const value = part.twoDigit ? padTwo(numericValue) : String(numericValue);
  return separateDigits(value, part.digitSeparator);
};

const lookupPartValue = (
  part: Extract<ImportedWeDynamicTextPart, { kind: 'lookup' }>,
  date: Date,
): string => {
  const index = part.field === 'month'
    ? date.getMonth()
    : part.field === 'weekday'
      ? date.getDay()
      : date.getDate();
  return part.values[index] ?? '';
};

export const formatWallpaperEngineDynamicText = (
  dynamicText: ImportedWeDynamicText,
  date: Date,
): string => {
  if (dynamicText.kind !== 'dateTime') return '';
  let result = '';
  for (const part of dynamicText.parts) {
    if (part.kind === 'literal') result += part.value;
    else if (part.kind === 'hour') {
      let hour = date.getHours();
      if (!part.use24Hour) hour = hour % 12 || 12;
      result += part.twoDigit ? padTwo(hour) : String(hour);
    } else if (part.kind === 'minute') {
      const minute = date.getMinutes();
      result += part.twoDigit ? padTwo(minute) : String(minute);
    } else if (part.kind === 'second') {
      const second = date.getSeconds();
      result += part.twoDigit ? padTwo(second) : String(second);
    } else if (part.kind === 'dayPeriod') {
      result += date.getHours() >= 12 ? part.pm : part.am;
    } else if (part.kind === 'number') {
      result += numberPartValue(part, date);
    } else if (part.kind === 'lookup') {
      result += lookupPartValue(part, date);
    }
  }
  return result;
};
