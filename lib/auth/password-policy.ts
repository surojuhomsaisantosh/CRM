export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasMaxLength: boolean;
  hasLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 12;
  const hasMaxLength = password.length <= 20;
  const hasLength = hasMinLength && hasMaxLength;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  return {
    hasMinLength,
    hasMaxLength,
    hasLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    isValid: hasLength && hasUppercase && hasNumber && hasSpecial,
  };
}
