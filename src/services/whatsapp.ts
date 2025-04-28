/**
 * Sends a message to a WhatsApp number.
 *
 * @param phoneNumber The WhatsApp number to send the message to.
 * @param message The message to send.
 * @returns A promise that resolves when the message is sent successfully.
 */
export async function sendMessageToWhatsapp(phoneNumber: string, message: string): Promise<void> {
  // TODO: Implement this by calling the Whatsapp API.
  console.log(`Sending message: ${message} to ${phoneNumber}`);
  return;
}
