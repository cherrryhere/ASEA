export function logInfo(message) {
  console.log(`✅ ${message}`);
}

export function logError(message, error) {
  console.error(`❌ ${message}`);

  if (error) {
    console.error(error);
  }
}