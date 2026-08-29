import type {
  WeResolvedDynamicText,
  WeResolvedDynamicTextPart,
} from './wallpaperEngineTypes';

type UnknownRecord = Record<string, unknown>;

type ScriptProperties = Record<string, unknown>;

type IfBlock = {
  condition: string;
  body: string;
};

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const propertyBaseValue = (value: unknown): unknown => (
  isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'value')
    ? value.value
    : value
);

const propertyValue = (properties: ScriptProperties, name: string): unknown => (
  propertyBaseValue(properties[name])
);

const propertyBoolean = (properties: ScriptProperties, name: string, fallback: boolean): boolean => {
  const value = propertyValue(properties, name);
  return typeof value === 'boolean' ? value : fallback;
};

const propertyString = (properties: ScriptProperties, name: string, fallback: string): string => {
  const value = propertyValue(properties, name);
  return typeof value === 'string' ? value : fallback;
};

const decodeQuotedString = (value: string): string | null => {
  if (value.length < 2) return null;
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) return null;
  const body = value.slice(1, -1);
  let result = '';
  for (let index = 0; index < body.length; index += 1) {
    const current = body[index];
    if (current !== '\\') {
      result += current;
      continue;
    }
    index += 1;
    if (index >= body.length) return null;
    const escaped = body[index];
    if (escaped === 'n') result += '\n';
    else if (escaped === 'r') result += '\r';
    else if (escaped === 't') result += '\t';
    else if (escaped === '\\') result += '\\';
    else if (escaped === quote) result += quote;
    else result += escaped;
  }
  return result;
};

const stripJsComments = (source: string): string => {
  let result = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === '\n') {
        lineComment = false;
        result += current;
      }
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      result += current;
      if (escaped) {
        escaped = false;
      } else if (current === '\\') {
        escaped = true;
      } else if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') quote = current;
    result += current;
  }
  return result;
};

const findMatching = (source: string, start: number, open: string, close: string): number => {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const current = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      continue;
    }
    if (current === open) depth += 1;
    else if (current === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const collectIfBlocks = (source: string): IfBlock[] => {
  const blocks: IfBlock[] = [];
  const regex = /\bif\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const conditionOpen = source.indexOf('(', match.index);
    if (conditionOpen < 0) continue;
    const conditionClose = findMatching(source, conditionOpen, '(', ')');
    if (conditionClose < 0) continue;
    let bodyOpen = conditionClose + 1;
    while (bodyOpen < source.length && /\s/.test(source[bodyOpen])) bodyOpen += 1;
    if (source[bodyOpen] !== '{') continue;
    const bodyClose = findMatching(source, bodyOpen, '{', '}');
    if (bodyClose < 0) continue;
    blocks.push({
      condition: source.slice(conditionOpen + 1, conditionClose).trim(),
      body: source.slice(bodyOpen + 1, bodyClose),
    });
  }
  return blocks;
};

const parseConditionLiteral = (raw: string): unknown => {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const decoded = decodeQuotedString(value);
  return decoded === null ? undefined : decoded;
};

const valuesLooselyEqual = (left: unknown, right: unknown): boolean => {
  if (typeof left === 'boolean' || typeof right === 'boolean') return Boolean(left) === Boolean(right);
  if (typeof left === 'number' || typeof right === 'number') return String(left) === String(right);
  return String(left) === String(right);
};

const evaluateConditionTerm = (term: string, properties: ScriptProperties): boolean | null => {
  const negated = term.match(/^\s*!\s*scriptProperties\.([A-Za-z_$][\w$]*)\s*$/);
  if (negated) return !Boolean(propertyValue(properties, negated[1]));
  const direct = term.match(/^\s*scriptProperties\.([A-Za-z_$][\w$]*)\s*$/);
  if (direct) return Boolean(propertyValue(properties, direct[1]));
  const comparison = term.match(/^\s*scriptProperties\.([A-Za-z_$][\w$]*)\s*(===|==|!==|!=)\s*(.+?)\s*$/);
  if (!comparison) return null;
  const right = parseConditionLiteral(comparison[3]);
  if (right === undefined) return null;
  const equal = valuesLooselyEqual(propertyValue(properties, comparison[1]), right);
  return comparison[2] === '!=' || comparison[2] === '!==' ? !equal : equal;
};

const evaluateCondition = (condition: string, properties: ScriptProperties): boolean | null => {
  const orParts = condition.split(/\|\|/);
  let sawUnknown = false;
  for (const orPart of orParts) {
    const andParts = orPart.split(/&&/);
    let all = true;
    for (const term of andParts) {
      const result = evaluateConditionTerm(term, properties);
      if (result === null) {
        sawUnknown = true;
        all = false;
        break;
      }
      if (!result) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return sawUnknown ? null : false;
};

const splitTopLevel = (source: string, delimiter: string): string[] => {
  const parts: string[] = [];
  let start = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let round = 0;
  let square = 0;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      continue;
    }
    if (current === '(') round += 1;
    else if (current === ')') round -= 1;
    else if (current === '[') square += 1;
    else if (current === ']') square -= 1;
    else if (current === delimiter && round === 0 && square === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
};

const evaluateSafeStringExpression = (
  expression: string,
  properties: ScriptProperties,
  variables: Record<string, string>,
): string | null => {
  const parts = splitTopLevel(expression.trim(), '+');
  let result = '';
  for (const part of parts) {
    const decoded = decodeQuotedString(part);
    if (decoded !== null) {
      result += decoded;
      continue;
    }
    const propertyMatch = part.match(/^scriptProperties\.([A-Za-z_$][\w$]*)$/);
    if (propertyMatch) {
      const value = propertyValue(properties, propertyMatch[1]);
      if (typeof value !== 'string' && typeof value !== 'number') return null;
      result += String(value);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(variables, part)) {
      result += variables[part];
      continue;
    }
    return null;
  }
  return result;
};

const extractBracketContent = (source: string, start: number): string | null => {
  const open = source.indexOf('[', start);
  if (open < 0) return null;
  const close = findMatching(source, open, '[', ']');
  return close < 0 ? null : source.slice(open + 1, close);
};

const findAssignmentExpression = (body: string, variable: string): string | null => {
  const match = new RegExp(`\\b${variable.replace(/[$]/g, '\\$&')}\\s*=\\s*`).exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  if (body[start] === '[') {
    const close = findMatching(body, start, '[', ']');
    return close < 0 ? null : body.slice(start, close + 1).trim();
  }
  let end = start;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let round = 0;
  while (end < body.length) {
    const current = body[end];
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = null;
      end += 1;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      end += 1;
      continue;
    }
    if (current === '(') round += 1;
    else if (current === ')') round -= 1;
    if ((current === ';' || current === '\n') && round === 0) break;
    end += 1;
  }
  return body.slice(start, end).trim();
};

const evaluateAssignedString = (
  body: string,
  variable: string,
  properties: ScriptProperties,
  variables: Record<string, string>,
): string | null => {
  const expression = findAssignmentExpression(body, variable);
  if (!expression) return null;
  const trimmed = expression.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const entries = splitTopLevel(trimmed.slice(1, -1), ',');
    if (entries.length !== 1) return null;
    return evaluateSafeStringExpression(entries[0], properties, variables);
  }
  return evaluateSafeStringExpression(trimmed, properties, variables);
};

const resolveConditionalString = (
  blocks: IfBlock[],
  variable: string,
  properties: ScriptProperties,
  variables: Record<string, string>,
): string | null => {
  let resolved: string | null = null;
  for (const block of blocks) {
    if (evaluateCondition(block.condition, properties) !== true) continue;
    const value = evaluateAssignedString(block.body, variable, properties, variables);
    if (value !== null) resolved = value;
  }
  return resolved;
};

const extractArrayAssignment = (body: string, variable: string): string[] | null => {
  const match = new RegExp(`\\b${variable.replace(/[$]/g, '\\$&')}\\s*=\\s*\\[`).exec(body);
  if (!match) return null;
  const inside = extractBracketContent(body, match.index + match[0].length - 1);
  return inside === null ? null : splitTopLevel(inside, ',');
};

const resolveConditionalArray = (
  blocks: IfBlock[],
  variable: string,
  properties: ScriptProperties,
  variables: Record<string, string>,
): string[] | null => {
  let resolved: string[] | null = null;
  for (const block of blocks) {
    if (evaluateCondition(block.condition, properties) !== true) continue;
    const entries = extractArrayAssignment(block.body, variable);
    if (!entries) continue;
    const values: string[] = [];
    let valid = true;
    for (const entry of entries) {
      const value = evaluateSafeStringExpression(entry, properties, variables);
      if (value === null) {
        valid = false;
        break;
      }
      values.push(value);
    }
    if (valid) resolved = values;
  }
  return resolved;
};

const findReturnExpression = (body: string): string | null => {
  const match = /\breturn\s+/.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  let end = start;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let round = 0;
  let square = 0;
  while (end < body.length) {
    const current = body[end];
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = null;
      end += 1;
      continue;
    }
    if (current === '"' || current === "'" || current === '`') {
      quote = current;
      end += 1;
      continue;
    }
    if (current === '(') round += 1;
    else if (current === ')') round -= 1;
    else if (current === '[') square += 1;
    else if (current === ']') square -= 1;
    if (round === 0 && square === 0 && (current === ';' || current === '\n' || current === '}')) break;
    end += 1;
  }
  const expression = body.slice(start, end).trim();
  return expression || null;
};

const findSelectedReturnExpression = (
  blocks: IfBlock[],
  properties: ScriptProperties,
  propertyName: string,
): string | null => {
  for (const block of blocks) {
    if (!block.condition.includes(`scriptProperties.${propertyName}`)) continue;
    if (evaluateCondition(block.condition, properties) !== true) continue;
    const expression = findReturnExpression(block.body);
    if (expression) return expression;
  }
  return null;
};

const mergeLiteral = (parts: WeResolvedDynamicTextPart[], value: string): void => {
  if (!value) return;
  const last = parts[parts.length - 1];
  if (last?.kind === 'literal') last.value += value;
  else parts.push({ kind: 'literal', value });
};

const compileDateReturn = (
  expression: string,
  properties: ScriptProperties,
  variables: Record<string, string>,
  months: string[] | null,
  weekdays: string[] | null,
  dayValues: string[] | null,
): WeResolvedDynamicTextPart[] | null => {
  const terms = splitTopLevel(expression, '+');
  const parts: WeResolvedDynamicTextPart[] = [];
  for (const term of terms) {
    const literal = decodeQuotedString(term);
    if (literal !== null) {
      mergeLiteral(parts, literal);
      continue;
    }
    if (term === 'delimiterValue' || term === 'newLine' || term === 'nl') {
      if (!Object.prototype.hasOwnProperty.call(variables, term)) return null;
      mergeLiteral(parts, variables[term]);
      continue;
    }
    if (/^day\s*\[\s*date\.getDay\(\)\s*\]$/.test(term)) {
      if (!weekdays || weekdays.length < 7) return null;
      parts.push({ kind: 'lookup', field: 'weekday', values: weekdays.slice(0, 7) });
      continue;
    }
    if (/^months\s*\[\s*date\.getMonth\(\)\s*\]$/.test(term)) {
      if (!months || months.length < 12) return null;
      parts.push({ kind: 'lookup', field: 'month', values: months.slice(0, 12) });
      continue;
    }
    if (/^dtt\s*\[\s*date\.getDate\(\)\s*\]$/.test(term)) {
      if (!dayValues || dayValues.length < 32) return null;
      parts.push({ kind: 'lookup', field: 'dayOfMonth', values: dayValues.slice(0, 32) });
      continue;
    }
    if (/^date\.getDate\(\)$/.test(term)) {
      parts.push({ kind: 'number', field: 'dayOfMonth', twoDigit: false, digitSeparator: '' });
      continue;
    }
    if (term === 'currentDate') {
      parts.push({ kind: 'number', field: 'dayOfMonth', twoDigit: true, digitSeparator: '' });
      continue;
    }
    if (/^date\.getFullYear\(\)$/.test(term)) {
      parts.push({ kind: 'number', field: 'year', twoDigit: false, digitSeparator: '' });
      continue;
    }
    if (term === 'year') {
      parts.push({ kind: 'number', field: 'year', twoDigit: false, digitSeparator: variables.newLine ?? '' });
      continue;
    }
    const safe = evaluateSafeStringExpression(term, properties, variables);
    if (safe !== null) {
      mergeLiteral(parts, safe);
      continue;
    }
    return null;
  }
  return parts.length ? parts : null;
};

const extractClockAffixes = (source: string): { prefix: string; suffix: string } => {
  const assignment = /\bvalue\s*=\s*([^;\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = assignment.exec(source))) {
    const expression = match[1];
    const hoursAt = expression.indexOf('hours');
    const minutesAt = expression.indexOf('minutes');
    if (hoursAt < 0 || minutesAt < hoursAt) continue;
    const before = expression.slice(0, hoursAt);
    const after = expression.slice(minutesAt + 'minutes'.length);
    const collect = (value: string): string => {
      const literals = value.match(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g) ?? [];
      return literals.map((literal) => decodeQuotedString(literal) ?? '').join('');
    };
    return { prefix: collect(before), suffix: collect(after) };
  }
  return { prefix: '', suffix: '' };
};

const extractDayPeriod = (source: string): { am: string; pm: string } | null => {
  const match = /hours\s*>=\s*12\s*\?\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*:\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/.exec(source);
  if (!match) return null;
  const pm = decodeQuotedString(match[1]);
  const am = decodeQuotedString(match[2]);
  return pm === null || am === null ? null : { am, pm };
};

const clockParts = (
  source: string,
  properties: ScriptProperties,
): WeResolvedDynamicTextPart[] | null => {
  if (!/\.getHours\s*\(/.test(source) || !/\.getMinutes\s*\(/.test(source)) return null;
  const use24Hour = propertyBoolean(properties, 'use24hFormat', true);
  const showSeconds = propertyBoolean(properties, 'showSeconds', false);
  const delimiter = propertyString(properties, 'delimiter', ':');
  const affixes = extractClockAffixes(source);
  const parts: WeResolvedDynamicTextPart[] = [];
  mergeLiteral(parts, affixes.prefix);
  parts.push({ kind: 'hour', use24Hour, twoDigit: true });
  mergeLiteral(parts, delimiter);
  parts.push({ kind: 'minute', twoDigit: true });
  if (showSeconds && /\.getSeconds\s*\(/.test(source)) {
    mergeLiteral(parts, delimiter);
    parts.push({ kind: 'second', twoDigit: true });
  }
  mergeLiteral(parts, affixes.suffix);
  if (!use24Hour) {
    const dayPeriod = extractDayPeriod(source);
    if (dayPeriod) parts.push({ kind: 'dayPeriod', am: dayPeriod.am, pm: dayPeriod.pm });
  }
  return parts;
};

const combinedClockDateParts = (
  source: string,
  properties: ScriptProperties,
  baseClockParts: WeResolvedDynamicTextPart[],
): WeResolvedDynamicTextPart[] | null => {
  if (!Object.prototype.hasOwnProperty.call(properties, 'displayDate')) return baseClockParts;
  if (!propertyBoolean(properties, 'displayDate', false)) return baseClockParts;
  if (!/\.getDate\s*\(/.test(source) || !/\.getMonth\s*\(/.test(source) || !/\.getFullYear\s*\(/.test(source)) return null;

  const hasMmDdYyyy = /scriptProperties\.useMMDDYYYY/.test(source) && /\$\{month\}\s*\/\s*\$\{day\}\s*\/\s*\$\{year\}/.test(source);
  const hasYyyyMmDd = /scriptProperties\.useYYYYMMDD/.test(source) && /\$\{year\}\s*\/\s*\$\{month\}\s*\/\s*\$\{day\}/.test(source);
  const hasDdMmYyyy = /\$\{day\}\s*\/\s*\$\{month\}\s*\/\s*\$\{year\}/.test(source);
  if (!hasDdMmYyyy) return null;

  const parts = [...baseClockParts];
  mergeLiteral(parts, '\n');
  const day: WeResolvedDynamicTextPart = { kind: 'number', field: 'dayOfMonth', twoDigit: true, digitSeparator: '' };
  const month: WeResolvedDynamicTextPart = { kind: 'number', field: 'month', twoDigit: true, digitSeparator: '' };
  const year: WeResolvedDynamicTextPart = { kind: 'number', field: 'year', twoDigit: false, digitSeparator: '' };
  if (propertyBoolean(properties, 'useMMDDYYYY', false) && hasMmDdYyyy) {
    parts.push(month); mergeLiteral(parts, '/'); parts.push(day); mergeLiteral(parts, '/'); parts.push(year);
  } else if (propertyBoolean(properties, 'useYYYYMMDD', false) && hasYyyyMmDd) {
    parts.push(year); mergeLiteral(parts, '/'); parts.push(month); mergeLiteral(parts, '/'); parts.push(day);
  } else {
    parts.push(day); mergeLiteral(parts, '/'); parts.push(month); mergeLiteral(parts, '/'); parts.push(year);
  }
  return parts;
};

const dateParts = (source: string, properties: ScriptProperties): WeResolvedDynamicTextPart[] | null => {
  if (!/\.getDate\s*\(/.test(source) || !/\.getMonth\s*\(/.test(source) || !/\.getFullYear\s*\(/.test(source)) return null;
  if (!Object.prototype.hasOwnProperty.call(properties, 'showDay')) return null;

  const clean = stripJsComments(source);
  const blocks = collectIfBlocks(clean);
  const variables: Record<string, string> = {};
  const alignVertical = propertyBoolean(properties, 'alignVertical', false);
  const variableCandidates = ['newLine', 'nl'];
  for (const variable of variableCandidates) {
    const resolved = resolveConditionalString(blocks, variable, properties, variables);
    if (resolved !== null) variables[variable] = resolved;
  }
  if (!Object.prototype.hasOwnProperty.call(variables, 'newLine') && alignVertical) variables.newLine = '\n';
  if (!Object.prototype.hasOwnProperty.call(variables, 'nl') && alignVertical) variables.nl = '\n';

  const delimiter = resolveConditionalString(blocks, 'delimiterValue', properties, variables);
  if (delimiter !== null) variables.delimiterValue = delimiter;
  else variables.delimiterValue = propertyBoolean(properties, 'useDelimiter', false)
    ? propertyString(properties, 'addDelimiter', '/')
    : ' ';

  const months = resolveConditionalArray(blocks, 'months', properties, variables);
  const weekdays = resolveConditionalArray(blocks, 'day', properties, variables);
  let dayValues = resolveConditionalArray(blocks, 'dtt', properties, variables);
  if (!dayValues && /\bdtt\s*=\s*\[/.test(clean)) {
    const direct = extractArrayAssignment(clean, 'dtt');
    if (direct) {
      const values: string[] = [];
      let valid = true;
      for (const entry of direct) {
        const value = evaluateSafeStringExpression(entry, properties, variables);
        if (value === null) { valid = false; break; }
        values.push(value);
      }
      if (valid) dayValues = values;
    }
  }

  const selectedReturn = findSelectedReturnExpression(blocks, properties, 'showDay');
  if (!selectedReturn) return null;
  return compileDateReturn(selectedReturn, properties, variables, months, weekdays, dayValues);
};

const refreshForParts = (parts: WeResolvedDynamicTextPart[]): WeResolvedDynamicText['refresh'] => {
  if (parts.some((part) => part.kind === 'second')) return 'second';
  if (parts.some((part) => part.kind === 'hour' || part.kind === 'minute' || part.kind === 'dayPeriod')) return 'minute';
  return 'day';
};

/**
 * Recognize a deliberately small, side-effect-free subset of Wallpaper Engine
 * SceneScript used for Date-driven text. The source string is inspected only;
 * it is never evaluated or passed to Function/eval.
 */
export const resolveWallpaperEngineDateTimeText = (
  script: string,
  scriptPropertiesValue: unknown,
): WeResolvedDynamicText | null => {
  if (!/\bnew\s+Date\s*\(/.test(script)) return null;
  const clean = stripJsComments(script);
  if (!/\bexport\s+function\s+update\s*\(/.test(clean)) return null;
  // Keep this recognizer pure: scripts that reach into the WE scene/runtime or
  // browser APIs remain on the base-value fallback path even if they also read Date.
  if (/\b(?:thisScene|thisLayer|engine|audio|fetch|XMLHttpRequest|require|window|document|localStorage|setTimeout|setInterval)\b/.test(clean)) {
    return null;
  }
  const properties = isRecord(scriptPropertiesValue) ? scriptPropertiesValue : {};

  const clock = clockParts(clean, properties);
  if (clock) {
    const parts = combinedClockDateParts(clean, properties, clock);
    if (!parts) return null;
    return { kind: 'dateTime', refresh: refreshForParts(parts), parts };
  }

  const parts = dateParts(clean, properties);
  if (!parts) return null;
  return { kind: 'dateTime', refresh: refreshForParts(parts), parts };
};
