/**
 * Helper function to ensure exhaustive type checking in switch statements
 * If a case is not handled, TypeScript will error at compile time
 */
export function assertNever(x: never): never {
    throw new Error(`Unhandled message type: ${JSON.stringify(x)}`);
}
