export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export interface PasswordRule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "min", label: "Al menos 8 caracteres", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "Una letra mayúscula", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "Una letra minúscula", test: (pw) => /[a-z]/.test(pw) },
  { key: "digit", label: "Un número", test: (pw) => /\d/.test(pw) },
  {
    key: "special",
    label: "Un carácter especial",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

export interface RuleResult {
  key: string;
  label: string;
  passed: boolean;
}

export function getRuleResults(password: string): RuleResult[] {
  return PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    passed: rule.test(password),
  }));
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const results = getRuleResults(password);
  const errors = results
    .filter((r) => !r.passed)
    .map((r) => r.label);
  return { valid: errors.length === 0, errors };
}
