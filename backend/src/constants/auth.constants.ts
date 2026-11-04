export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export const PASSWORD_LIMITS = {
  minLength: 8,
  /** bcrypt only uses the first 72 bytes; longer passwords are rejected rather than silently truncated. */
  maxBytes: 72,
} as const;
