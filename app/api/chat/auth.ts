import { GoogleAuth } from "google-auth-library";

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_KEY_JSON ?? "", "base64").toString()
);

export const googleAuth = new GoogleAuth({ credentials });

export async function getIdToken(serviceUrl: string) {
  try {
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });

    const client = await auth.getIdTokenClient(serviceUrl);

    return client.idTokenProvider.fetchIdToken(serviceUrl);
  } catch (error) {
    console.error("Error generating ID token:", error);
    throw error;
  }
}
