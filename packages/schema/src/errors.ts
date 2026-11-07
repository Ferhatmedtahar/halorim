export class SceneValidationError extends Error {
  public readonly issues: readonly { path: string; message: string }[];

  constructor(message: string, issues: readonly { path: string; message: string }[] = []) {
    super(message);
    this.name = 'SceneValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, SceneValidationError.prototype);
  }
}

export class UnsupportedVersionError extends Error {
  public readonly receivedVersion: unknown;
  public readonly supportedVersions: readonly number[];

  constructor(receivedVersion: unknown, supportedVersions: readonly number[]) {
    super(
      `Unsupported schemaVersion: ${String(receivedVersion)}. Supported versions: ${supportedVersions.join(', ')}`,
    );
    this.name = 'UnsupportedVersionError';
    this.receivedVersion = receivedVersion;
    this.supportedVersions = supportedVersions;
    Object.setPrototypeOf(this, UnsupportedVersionError.prototype);
  }
}
