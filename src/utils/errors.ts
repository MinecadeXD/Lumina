export class LuminaError extends Error {
  readonly code: string;

  constructor(message: string, code = "LUMINA_ERROR") {
    super(message);
    this.name = "LuminaError";
    this.code = code;
  }
}

export class ConfigurationError extends LuminaError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}
